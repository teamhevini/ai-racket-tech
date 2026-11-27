import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Check, CreditCard, Info, Loader2 } from "lucide-react";
import { FREE_SHOP_MONTHLY_BOOKINGS, SHOP_PLANS } from "@shared/tiers";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { api } from "@/lib/api";
import { useRefreshMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import type { ShopMe } from "./types";
import { PAYMENTS_OFF, errMsg, invalidateShop, isPaymentsOff } from "./util";

export function Billing({ data }: { data: ShopMe }) {
  const shop = data.shop!;
  const pro = shop.plan === "pro";
  const qc = useQueryClient();
  const refreshMe = useRefreshMe();
  const [, navigate] = useLocation();
  const [notice, setNotice] = React.useState<string | null>(null);
  const verifying = React.useRef(false);
  const sessionId = new URLSearchParams(window.location.search).get("session_id");

  const verify = useMutation({
    mutationFn: (id: string) => api("POST", "/api/shop/checkout/verify", { session_id: id }),
    onSuccess: async () => {
      toast.success("Welcome to Shop Pro", { description: "Unlimited bookings, full histories and insights are on." });
      await Promise.all([refreshMe(), invalidateShop(qc)]);
    },
    onError: (e) => setNotice(isPaymentsOff(e) ? PAYMENTS_OFF : errMsg(e)),
    onSettled: () => navigate("/shop/billing", { replace: true }),
  });

  React.useEffect(() => {
    if (sessionId && !verifying.current) {
      verifying.current = true;
      verify.mutate(sessionId);
    }
  }, [sessionId, verify]);

  const redirect = (path: string) =>
    api<{ url: string | null }>("POST", path).then((r) => {
      if (!r.url) throw new Error("Couldn't open Stripe. Please try again.");
      window.location.href = r.url;
    });
  const checkout = useMutation({
    mutationFn: () => redirect("/api/shop/checkout"),
    onError: (e) => (isPaymentsOff(e) ? setNotice(PAYMENTS_OFF) : toast.error(errMsg(e))),
  });
  const portal = useMutation({
    mutationFn: () => redirect("/api/shop/billing-portal"),
    onError: (e) => (isPaymentsOff(e) ? setNotice(PAYMENTS_OFF) : toast.error(errMsg(e))),
  });

  const used = data.usage?.bookingsThisMonth ?? 0;
  const limit = data.usage?.limit ?? null;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="space-y-8">
      {verify.isPending && (
        <Card className="flex items-center gap-3 p-5">
          <Loader2 className="size-5 animate-spin text-muted" /> Confirming your payment…
        </Card>
      )}
      {notice && (
        <div className="flex items-start gap-3 rounded-2xl bg-hard-soft p-4 text-sm text-hard" role="status">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Current plan</p>
            <p className="display mt-1 text-4xl">{pro ? SHOP_PLANS.pro.name : SHOP_PLANS.free.name}</p>
            <p className="mt-1 text-sm text-muted">{pro ? `${SHOP_PLANS.pro.price} ${SHOP_PLANS.pro.cadence}` : "Free forever"}</p>
          </div>
          {pro ? (
            <Button variant="outline" loading={portal.isPending} onClick={() => portal.mutate()} disabled={!shop.stripeCustomerId}>
              <CreditCard /> Manage billing
            </Button>
          ) : (
            <Button size="lg" loading={checkout.isPending} onClick={() => checkout.mutate()}>
              Upgrade to Shop Pro
            </Button>
          )}
        </div>
        {!pro && limit != null && (
          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span>
                <span className="font-mono font-semibold tabular">{used}</span> of {limit} app bookings this month
              </span>
              <span className="text-muted">walk-ins unlimited</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}>
              <div className={cn("h-full rounded-full transition-[width] duration-700 ease-spring", pct >= 100 ? "bg-brand" : pct >= 75 ? "bg-clay" : "bg-grass")} style={{ width: `${pct}%` }} />
            </div>
            {pct >= 100 && <p className="mt-2 text-sm text-brand">You've used this month's app bookings. Upgrade for unlimited — walk-ins never count.</p>}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(["free", "pro"] as const).map((k) => {
          const p = SHOP_PLANS[k];
          const current = (k === "pro") === pro;
          return (
            <Card key={k} className={cn("relative flex flex-col p-6", k === "pro" && "bg-ink text-bg ring-ink")}>
              {k === "pro" && <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-ball/20 blur-3xl" />}
              <div className="relative flex items-center justify-between gap-2">
                <p className="display text-3xl">{p.name}</p>
                {current && <Badge tone={k === "pro" ? "ball" : "neutral"}>Your plan</Badge>}
              </div>
              <p className="relative mt-3">
                <span className="font-mono text-4xl font-semibold tabular">{p.price}</span>
                <span className={cn("ml-1.5 text-sm", k === "pro" ? "text-bg/60" : "text-muted")}>{p.cadence}</span>
              </p>
              <ul className="relative mt-5 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className={cn("mt-0.5 size-4 shrink-0", k === "pro" ? "text-ball" : "text-grass")} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {k === "pro" && !pro && (
                <Button variant="ball" size="lg" className="relative mt-6 w-full" loading={checkout.isPending} onClick={() => checkout.mutate()}>
                  Upgrade — {p.price}/mo
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Free shops take {FREE_SHOP_MONTHLY_BOOKINGS} app bookings a month. Shop Pro is billed monthly through Stripe; cancel any time from Manage billing.
      </p>
    </div>
  );
}
