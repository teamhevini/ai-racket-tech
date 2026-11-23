import { Router, type Request } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { PLANS } from "@shared/tiers";
import type { UserTier } from "@shared/schema";
import { asyncHandler, currentUser, loadUser, publicUser, requireAuth } from "../auth";
import { storage } from "../storage";
import { parseBody } from "./util";

export const billingRouter = Router();

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) throw Object.assign(new Error("Payments aren't configured yet."), { status: 503 });
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}
/** Tests swap in a fake Stripe client. */
export function setStripeForTests(fake: Stripe | null) {
  _stripe = fake;
}

const appUrl = (req: Request) => process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;

/**
 * Checkout now requires an account, so every payment is tied to a user id.
 * (v1 let logged-out visitors pay with just an email, which created accounts
 * nobody could log into — the main reason paid members "lost" their history.)
 */
billingRouter.post(
  "/api/checkout/:plan(pro|club)",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const plan = req.params.plan as "pro" | "club";
    if (user.tier === plan || (plan === "pro" && user.tier === "club")) {
      return res.status(400).json({ message: `You already have ${PLANS[user.tier as "pro" | "club"].name}.` });
    }
    const details = PLANS[plan];
    const session = await getStripe().checkout.sessions.create({
      mode: plan === "club" ? "subscription" : "payment",
      customer: user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      client_reference_id: String(user.id),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `10IS ${details.name}` },
            unit_amount: details.amountCents,
            ...(plan === "club" ? { recurring: { interval: "month" as const } } : {}),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl(req)}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl(req)}/pricing`,
      metadata: { userId: String(user.id), tier: plan },
      ...(plan === "club" ? { subscription_data: { metadata: { userId: String(user.id) } } } : {}),
    });
    res.json({ url: session.url });
  }),
);

async function applyCheckoutSession(session: Stripe.Checkout.Session): Promise<UserTier | null> {
  const userId = Number(session.metadata?.userId ?? session.client_reference_id);
  const tier = session.metadata?.tier as "pro" | "club" | undefined;
  if (!userId || !tier || session.payment_status === "unpaid") return null;
  const user = await storage.getUserById(userId);
  if (!user) return null;
  // Never downgrade Club to Pro because of an old Pro receipt.
  const nextTier: UserTier = user.tier === "club" && tier === "pro" ? "club" : tier;
  await storage.updateUser(user.id, {
    tier: nextTier,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? user.stripeCustomerId,
    stripeSubscriptionId:
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? user.stripeSubscriptionId,
  });
  return nextTier;
}

billingRouter.post(
  "/api/checkout/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(z.object({ session_id: z.string().min(1).max(300) }), req.body, res);
    if (!data) return;
    const session = await getStripe().checkout.sessions.retrieve(data.session_id);
    if (String(session.metadata?.userId ?? session.client_reference_id) !== String(user.id)) {
      return res.status(403).json({ message: "This payment belongs to a different account." });
    }
    const tier = await applyCheckoutSession(session);
    if (!tier) return res.status(402).json({ message: "Payment isn't complete yet." });
    req.user = undefined;
    res.json({ success: true, tier, user: publicUser(await loadUser(req)) });
  }),
);

billingRouter.post(
  "/api/webhooks/stripe",
  asyncHandler(async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ message: "Webhook secret not configured" });
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.rawBody as Buffer,
        req.headers["stripe-signature"] as string,
        secret,
      );
    } catch {
      return res.status(400).json({ message: "Webhook signature verification failed" });
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await applyCheckoutSession(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const ended = event.type === "customer.subscription.deleted" || ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);
      if (ended) {
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const byMeta = sub.metadata?.userId ? await storage.getUserById(Number(sub.metadata.userId)) : undefined;
        const user = byMeta ?? (await storage.getUserByStripeCustomerId(customerId));
        if (user && user.tier === "club" && user.stripeSubscriptionId === sub.id) {
          await storage.updateUser(user.id, { tier: "free", stripeSubscriptionId: null });
        }
      }
    }
    res.json({ received: true });
  }),
);

billingRouter.post(
  "/api/account/cancel-subscription",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    if (!user.stripeSubscriptionId) return res.status(400).json({ message: "You don't have an active subscription." });
    const sub = await getStripe().subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
    res.json({ cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null });
  }),
);

billingRouter.post(
  "/api/account/billing-portal",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    if (!user.stripeCustomerId) return res.status(400).json({ message: "No billing history yet." });
    const portal = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl(req)}/account?tab=plan`,
    });
    res.json({ url: portal.url });
  }),
);
