import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import Stripe from "stripe";
import { onboardingInputsSchema, recommendationOutputSchema, type OnboardingInputs } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat/routes";

const ADMIN_EMAIL = "contact@hevini.com";
const APP_URL = process.env.APP_URL || "http://localhost:5000";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-04-30.basil",
    });
  }
  return _stripe;
}

function getCookieValue(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getUserEmail(req: Request): string | null {
  if (req.session?.email) return req.session.email;
  return getCookieValue(req, "user_email") || null;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const email = getUserEmail(req);
  if (!email) { res.status(401).json({ message: "Unauthorized" }); return; }
  if (email === ADMIN_EMAIL) { next(); return; }
  const user = await storage.getUserByEmail(email);
  if (!user?.isAdmin) { res.status(403).json({ message: "Forbidden" }); return; }
  next();
}

function buildUserResponse(user: { tier: string; isAdmin: boolean; email: string; firstName?: string | null; lastName?: string | null }) {
  return { tier: user.tier, isAdmin: user.isAdmin, email: user.email, firstName: user.firstName ?? null, lastName: user.lastName ?? null };
}

// Initialize OpenAI lazily to avoid startup errors if env vars aren't set yet
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Racket Routes ---

  app.get(api.rackets.search.path, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        const all = await storage.getAllRackets();
        return res.json(all);
      }
      const results = await storage.searchRackets(query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get(api.rackets.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const racket = await storage.getRacket(id);
    if (!racket) return res.status(404).json({ message: "Racket not found" });
    res.json(racket);
  });

  // --- Recommendation Route ---

  app.post(api.recommend.create.path, async (req, res) => {
    try {
      const input = onboardingInputsSchema.parse(req.body);

      // 1. Fetch Racket Specs if available
      let racketSpecs = null;
      if (input.racketId) {
        racketSpecs = await storage.getRacket(input.racketId);
      }

      // 2. Determine Confidence
      let confidence: "high" | "medium" | "estimated" = "high";
      if (!input.racketId) confidence = "estimated";
      else if (!input.level || !input.stringHistory) confidence = "medium";

      // 3. Construct Prompt for OpenAI
      const ra = racketSpecs?.stiffnessRa;
      const pattern = racketSpecs?.stringPattern;
      const headSize = racketSpecs?.headSize;
      const beam = racketSpecs?.beamWidth;
      const bal = racketSpecs?.balance;
      const wt = racketSpecs?.weightUnstrung;
      const tMin = racketSpecs?.recTensionMin || 45;
      const tMax = racketSpecs?.recTensionMax || 60;
      const tMid = Math.round((tMin + tMax) / 2);

      const prompt = `
        Act as a professional tennis racket technician. Recommend a string setup that
        is cross-functionally tuned to BOTH the racket's physical specs AND the
        player's profile.

        Player Profile:
        - Level: ${input.level || "Unknown"}
        - Playstyle: ${input.playstyle || "Unknown"}
        - Goals: ${input.goals?.join(", ") || "None"}
        - Swing Speed: ${input.swingSpeed || "Unknown"}
        - Injury Risk: ${input.injuryRisk || "None"}
        - Play Frequency: ${input.frequency || "Unknown"} hours/week
        - String History: ${input.stringHistory || "Unknown"}
        - Tension History: ${input.tensionHistory || "Unknown"}

        Racket Specs:
        ${racketSpecs ? JSON.stringify(racketSpecs) : "Unknown Racket"}

        Cross-functional rules — apply ALL that fit, weighted by how strongly the spec
        and the player's profile push in the same direction:

        SAFETY / INJURY (highest priority)
        - Injury risk = elbow/shoulder/wrist OR racket stiffness RA >= 67: AVOID full
          stiff polyester. Recommend multifilament, natural gut, or a soft hybrid
          (gut/multi mains, soft poly crosses) and bias tension to the LOWER half of
          the racket's range (${tMin}–${tMid} lbs).

        FRAME STIFFNESS (RA = ${ra ?? "unknown"})
        - RA >= 68 (stiff frame, e.g. Pure Drive/Aero, Ultra): pair with a softer
          string or drop tension 2–3 lbs to protect the arm.
        - RA <= 62 (flexible frame, e.g. Pro Staff, Prestige, Blade): can handle
          stiffer/crisper strings; tension can sit mid-to-upper range for control.

        STRING PATTERN (${pattern ?? "unknown"})
        - 18x20 / 18x19 (dense, e.g. Prestige Pro, Pure Strike VS): poly is fine,
          tension can sit MID-LOW for a livelier response; great with control polys.
        - 16x19 / 16x20 (open-to-medium): standard tuning around mid-range.
        - 16x18 / 16x15 / very open (e.g. Prince ATS Tour 100P): use a
          spin-friendly poly and bias tension UPPER half (${tMid}–${tMax} lbs) to
          tame launch angle; warn about faster string movement / shorter life.

        HEAD SIZE & WEIGHT (${headSize ?? "?"} sq in, ${wt ?? "?"} g)
        - Head size >= 104 OR unstrung weight <= 285 g (tweener/light): LOWER tension
          (${tMin}–${tMid - 1}) for control; avoid stiffest polys.
        - Head size <= 98 AND weight >= 310 g (player's frame): the player needs to
          generate spin/power; mid tension and modern poly or hybrid work well.

        BEAM WIDTH (${beam ?? "unknown"})
        - Beam >= 25 mm (power frame): drop tension and/or soften strings to balance
          the extra power.
        - Beam <= 21 mm (control frame): can push tension slightly higher for feel.

        BALANCE (${bal ?? "unknown"})
        - Head-heavy (HH) or even-balance light frames generate easy power → soften
          string / drop tension.
        - 5+ pts head-light, traditional player frames → standard or upper-range
          tension is fine for control.

        PLAYSTYLE & GOALS
        - Heavy-spin baseliner / aggressive: shaped or textured poly mains; consider
          gut/multi crosses for comfort if RA is high.
        - All-court / serve & volley: hybrid with multi or gut for touch.
        - Defensive / comfort goals: multi or gut, lower tension.
        - Frequency 5+ hrs/week: warn about poly tension-loss; recommend
          restringing every ~15–20 hours or switching to multi/hybrid for durability.

        TENSION BOUNDS (always respect)
        - Stay within the racket's recommended range: ${tMin}–${tMax} lbs.
        - Default fallbacks if unknown: Poly 45–52, Multi 52–58, Gut 52–60.

        EXPLANATION
        - In "explanation", explicitly cite at least TWO racket specs (e.g. "RA 68 +
          16x19 pattern") and at least ONE player factor that drove the choice, so
          the recommendation feels personalized and not generic.
        
        Output JSON ONLY matching this exact schema:
        {
          "setup": { 
            "mains": { "stringFamily": "String type", "exampleStrings": ["Specific Model 1", "Specific Model 2"], "gauge": "16 or 17", "tension": "number as string" },
            "crosses": { "stringFamily": "String type", "exampleStrings": ["Specific Model 1"], "gauge": "16 or 17", "tension": "number as string" }
          },
          "alternatives": [ 
            { "stringFamily": "Type", "exampleStrings": ["Model"], "gauge": "16/17", "tension": "number" }
          ],
          "explanation": "Brief technician reasoning",
          "warnings": ["Health/Performance warnings"],
          "confidenceReason": "Why this setup matches"
        }
      `;

      // 4. Call OpenAI with validation + retry + safe fallback
      const callOpenAI = async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "You are a professional tennis stringing expert and technician. You recommend string setups based on racket specs and player profile. You provide detailed explanations and specific string models (e.g., 'Luxilon ALU Power 1.25', 'Babolat VS Touch'). Always respond in valid JSON format only, no markdown, no extra text." 
            }, 
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
        });
        const raw = completion.choices[0].message.content || "{}";
        return recommendationOutputSchema.parse(JSON.parse(raw));
      };

      const safeRecommendation = {
        setup: {
          mains: {
            stringFamily: input.injuryRisk && input.injuryRisk !== "none" ? "Multifilament" : "Polyester",
            exampleStrings: input.injuryRisk && input.injuryRisk !== "none"
              ? ["Wilson NXT 16", "Tecnifibre X-One Biphase 16"]
              : ["Luxilon ALU Power 125", "Babolat RPM Blast 125"],
            gauge: "16",
            tension: racketSpecs ? String(Math.round(((racketSpecs.recTensionMin || 48) + (racketSpecs.recTensionMax || 57)) / 2)) : "52",
          },
        },
        alternatives: [
          { stringFamily: "Synthetic Gut", exampleStrings: ["Prince Synthetic Gut 16"], gauge: "16", tension: "54" },
          { stringFamily: "Hybrid", exampleStrings: ["Luxilon ALU Power 125 / Wilson NXT 16"], gauge: "16/17", tension: "50/52" },
        ],
        explanation: "This is a safe baseline recommendation. For a more personalized setup, try again — our AI is on it.",
        warnings: ["This is an estimated fallback recommendation. Results may vary."],
        confidenceReason: "Fallback due to validation issue.",
      };

      let recommendation;
      try {
        recommendation = await callOpenAI();
      } catch (firstErr: any) {
        console.warn("[recommend] OpenAI attempt 1 failed:", firstErr?.message ?? firstErr);
        try {
          recommendation = await callOpenAI();
        } catch (secondErr: any) {
          console.error("[recommend] OpenAI attempt 2 failed, using safe fallback:", secondErr?.message ?? secondErr);
          recommendation = safeRecommendation;
        }
      }

      // 5. Save Run
      console.log("[recommend] Saving run to DB, confidence:", confidence);
      const runEmail = getUserEmail(req);
      const runUser = runEmail ? await storage.getUserByEmail(runEmail) : null;
      const run = await storage.createRecommendationRun({
        racketId: input.racketId,
        sessionId: "temp-session",
        userId: runUser?.id ?? null,
        inputsJson: input,
        outputJson: recommendation,
        confidence,
      });

      res.status(201).json({
        runId: run.id,
        recommendation,
        confidence
      });

    } catch (error: any) {
      const msg = error?.message ?? String(error);
      const code = error?.code;
      console.error("[recommend] Unhandled error — message:", msg, "| code:", code);
      console.error("[recommend] Stack:", error?.stack);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to generate recommendation", detail: msg });
      }
    }
  });

  // --- Get recommendation run by ID ---
  app.get("/api/recommendation-runs/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const run = await storage.getRecommendationRun(id);
      if (!run) return res.status(404).json({ message: "Not found" });
      res.json({
        runId: run.id,
        recommendation: run.outputJson,
        confidence: run.confidence,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recommendation" });
    }
  });

  // --- Feedback Route ---

  app.post(api.feedback.create.path, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);
      const feedback = await storage.createFeedback(input);
      res.status(201).json(feedback);
    } catch (error) {
      res.status(400).json({ message: "Invalid feedback" });
    }
  });

  // --- Stringers Search (Google Places Text Search) ---

  app.get(api.stringers.search.path, async (req, res) => {
    try {
      const { query, lat, lng } = req.query as { query?: string; lat?: string; lng?: string };
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.error("[stringers] GOOGLE_MAPS_API_KEY not set");
        return res.json([]);
      }

      let placesUrl: string;
      if (lat && lng) {
        placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent("tennis stringer")}&location=${lat},${lng}&radius=25000&key=${apiKey}`;
      } else if (query) {
        placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`tennis stringer near ${query}`)}&key=${apiKey}`;
      } else {
        return res.json([]);
      }

      const placesRes = await fetch(placesUrl);

      if (!placesRes.ok) {
        console.error(`[stringers] Google Places returned ${placesRes.status}`);
        return res.json([]);
      }

      const ct = placesRes.headers.get("content-type") ?? "";
      if (!ct.includes("json")) {
        const body = await placesRes.text();
        console.error("[stringers] Google Places returned non-JSON:", body.slice(0, 200));
        return res.json([]);
      }

      const placesData = await placesRes.json();

      if (placesData.status !== "OK" && placesData.status !== "ZERO_RESULTS") {
        console.error("[stringers] Google Places error:", placesData.status, placesData.error_message);
        return res.json([]);
      }

      const results = (placesData.results || []).map((place: any) => ({
        name: place.name,
        address: place.formatted_address || "",
        place_id: place.place_id,
        geometry: place.geometry,
        types: place.types || [],
        website: undefined as string | undefined,
        phone: undefined as string | undefined,
      }));

      res.json(results);
    } catch (error) {
      console.error("Stringer search error:", error);
      res.status(500).json({ message: "Failed to search for stringers" });
    }
  });

  // --- Auth Routes ---

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      if (!firstName || !lastName) return res.status(400).json({ message: "First and last name required" });
      if (typeof password !== "string" || password.length < 8)
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) return res.status(409).json({ message: "An account with this email already exists" });
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser(email.toLowerCase(), passwordHash, firstName.trim(), lastName.trim());
      req.session.email = user.email;
      res.json(buildUserResponse({ tier: user.tier, isAdmin: user.isAdmin, email: user.email }));
    } catch (error) {
      console.error("[auth/signup]", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const normalizedEmail = email.toLowerCase();
      if (normalizedEmail === ADMIN_EMAIL) {
        // Admin login: check password if hash exists, otherwise allow if ADMIN_PASSWORD matches
        const user = await storage.getUserByEmail(normalizedEmail);
        if (user?.passwordHash) {
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return res.status(401).json({ message: "Invalid email or password" });
        } else if (password !== process.env.ADMIN_PASSWORD) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        req.session.email = normalizedEmail;
        return res.json({ tier: "club", isAdmin: true, email: normalizedEmail });
      }
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user || !user.passwordHash) return res.status(401).json({ message: "Invalid email or password" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });
      req.session.email = user.email;
      await storage.upsertUser(user.email, { updatedAt: new Date() });
      res.json(buildUserResponse({ tier: user.tier, isAdmin: user.isAdmin, email: user.email }));
    } catch (error) {
      console.error("[auth/login]", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("user_email");
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const email = getUserEmail(req);
    if (!email) return res.json({ tier: "free", isAdmin: false, email: null, firstName: null, lastName: null });
    if (email === ADMIN_EMAIL) return res.json({ tier: "club", isAdmin: true, email, firstName: null, lastName: null });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.json({ tier: "free", isAdmin: false, email, firstName: null, lastName: null });
    res.json(buildUserResponse(user));
  });

  // --- Admin Routes ---

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(u => ({
        id: u.id,
        email: u.email,
        tier: u.tier,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/tier", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { tier } = req.body;
      if (!["free", "pro", "club"].includes(tier)) return res.status(400).json({ message: "Invalid tier" });
      await storage.setUserTierById(id, tier);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update tier" });
    }
  });

  app.patch("/api/admin/users/:id/admin", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { isAdmin } = req.body;
      await storage.setUserAdmin(id, Boolean(isAdmin));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update admin status" });
    }
  });

  // --- User Tier ---

  app.get("/api/user/tier", async (req, res) => {
    const email = getUserEmail(req);
    if (!email) return res.json({ tier: "free", isAdmin: false, email: null });
    if (email === ADMIN_EMAIL) return res.json({ tier: "club", isAdmin: true, email });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.json({ tier: "free", isAdmin: false, email });
    res.json({ tier: user.tier, isAdmin: user.isAdmin, email });
  });

  // --- Stripe Checkout ---

  app.post("/api/checkout/pro", async (req, res) => {
    try {
      const email = getUserEmail(req) || req.body.email;
      if (!email) return res.status(400).json({ message: "Email required" });
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: "10IS Pro" },
            unit_amount: 499,
          },
          quantity: 1,
        }],
        success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&tier=pro`,
        cancel_url: `${APP_URL}/pricing`,
        metadata: { email, tier: "pro" },
      });
      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout pro error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/checkout/club", async (req, res) => {
    try {
      const email = getUserEmail(req) || req.body.email;
      if (!email) return res.status(400).json({ message: "Email required" });
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: email,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: "10IS Club" },
            unit_amount: 199,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&tier=club`,
        cancel_url: `${APP_URL}/pricing`,
        metadata: { email, tier: "club" },
      });
      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout club error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/checkout/verify", async (req, res) => {
    try {
      const { session_id } = req.body;
      if (!session_id) return res.status(400).json({ message: "Session ID required" });
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      const email = session.customer_email || (session.metadata?.email ?? null);
      const tier = (session.metadata?.tier ?? null) as "pro" | "club" | null;
      if (email && tier && session.payment_status !== "unpaid") {
        await storage.upsertUser(email, {
          tier,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
        });
        req.session.email = email;
        res.setHeader(
          "Set-Cookie",
          `user_email=${encodeURIComponent(email)}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax`
        );
        return res.json({ tier, email, success: true });
      }
      res.status(400).json({ message: "Payment not completed" });
    } catch (error) {
      console.error("Checkout verify error:", error);
      res.status(500).json({ message: "Failed to verify session" });
    }
  });

  // --- Stripe Webhook ---

  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const rawBody = (req as any).rawBody as Buffer;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(500).json({ message: "Webhook secret not configured" });

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
    } catch (err) {
      console.error("Webhook signature error:", err);
      return res.status(400).json({ message: "Webhook signature verification failed" });
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || (session.metadata?.email ?? null);
        const tier = (session.metadata?.tier ?? null) as "pro" | "club" | null;
        if (email && tier) {
          await storage.upsertUser(email, {
            tier,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
          });
        }
      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        // Find user by stripe customer ID and downgrade
        const allUsers = await storage.getAllUsers();
        const user = allUsers.find((u) => u.stripeCustomerId === customerId);
        if (user) await storage.setUserTier(user.email, "free");
      }
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // --- Account Routes (require auth) ---

  async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const email = getUserEmail(req);
    if (!email) { res.status(401).json({ message: "Unauthorized" }); return; }
    next();
  }

  async function getAuthUser(req: Request) {
    const email = getUserEmail(req);
    if (!email) return null;
    if (email === ADMIN_EMAIL) {
      return await storage.getUserByEmail(email) ?? await storage.upsertUser(email, { isAdmin: true, tier: "club" });
    }
    return await storage.getUserByEmail(email);
  }

  // Profile
  app.get("/api/account/profile", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
        tier: user.tier, isAdmin: user.isAdmin, createdAt: user.createdAt,
        reminderEnabled: user.reminderEnabled, reminderFrequencyWeeks: user.reminderFrequencyWeeks,
        lastRestrungAt: user.lastRestrungAt, stripeSubscriptionId: user.stripeSubscriptionId,
      });
    } catch (e) { res.status(500).json({ message: "Failed to load profile" }); }
  });

  app.patch("/api/account/profile", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { firstName, lastName, email } = req.body;
      if (email && email !== user.email) {
        const existing = await storage.getUserByEmail(email.toLowerCase());
        if (existing) return res.status(409).json({ message: "Email already in use" });
      }
      const updated = await storage.updateUserProfile(user.id, {
        firstName: firstName?.trim() || undefined,
        lastName: lastName?.trim() || undefined,
        email: email?.toLowerCase() || undefined,
      });
      if (email && email !== user.email) req.session.email = email.toLowerCase();
      res.json({ success: true, firstName: updated.firstName, lastName: updated.lastName, email: updated.email });
    } catch (e) { res.status(500).json({ message: "Failed to update profile" }); }
  });

  app.post("/api/account/change-password", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });
      if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters" });
      if (user.passwordHash) {
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
      }
      const hash = await bcrypt.hash(newPassword, 12);
      await storage.updateUserPassword(user.id, hash);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: "Failed to change password" }); }
  });

  // Reminders
  app.patch("/api/account/reminders", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { reminderEnabled, reminderFrequencyWeeks, lastRestrungAt } = req.body;
      await storage.updateUserReminders(user.id, {
        reminderEnabled: Boolean(reminderEnabled),
        reminderFrequencyWeeks: Number(reminderFrequencyWeeks) || 4,
        lastRestrungAt: lastRestrungAt ? new Date(lastRestrungAt) : null,
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: "Failed to update reminders" }); }
  });

  // Saved Rackets
  app.get("/api/account/rackets", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await storage.getSavedRackets(user.id));
    } catch (e) { res.status(500).json({ message: "Failed to load rackets" }); }
  });

  app.post("/api/account/rackets", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const FREE_LIMIT = 3;
      if (user.tier === "free" && !user.isAdmin) {
        const existing = await storage.getSavedRackets(user.id);
        if (existing.length >= FREE_LIMIT) return res.status(403).json({ message: "Free plan limited to 3 rackets" });
      }
      const { nickname, brand, model, headSize, stringPattern, weight } = req.body;
      if (!nickname) return res.status(400).json({ message: "Nickname required" });
      const racket = await storage.createSavedRacket(user.id, { nickname, brand, model, headSize: headSize ? Number(headSize) : null, stringPattern, weight: weight ? Number(weight) : null });
      res.status(201).json(racket);
    } catch (e) { res.status(500).json({ message: "Failed to save racket" }); }
  });

  app.patch("/api/account/rackets/:id", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { nickname, brand, model, headSize, stringPattern, weight } = req.body;
      const updated = await storage.updateSavedRacket(Number(req.params.id), user.id, { nickname, brand, model, headSize: headSize ? Number(headSize) : undefined, stringPattern, weight: weight ? Number(weight) : undefined });
      if (!updated) return res.status(404).json({ message: "Racket not found" });
      res.json(updated);
    } catch (e) { res.status(500).json({ message: "Failed to update racket" }); }
  });

  app.delete("/api/account/rackets/:id", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.deleteSavedRacket(Number(req.params.id), user.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: "Failed to delete racket" }); }
  });

  // Recommendations history
  app.get("/api/account/recommendations", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const runs = await storage.getRecommendationsByUserId(user.id);
      const withRackets = await Promise.all(runs.map(async (run) => {
        const racket = run.racketId ? await storage.getRacket(run.racketId) : null;
        return { ...run, racket };
      }));
      res.json(withRackets);
    } catch (e) { res.status(500).json({ message: "Failed to load recommendations" }); }
  });

  // Saved Stringers
  app.get("/api/account/stringers", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await storage.getSavedStringers(user.id));
    } catch (e) { res.status(500).json({ message: "Failed to load stringers" }); }
  });

  app.post("/api/account/stringers", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { stringerName, stringerAddress, stringerPlaceId, notes } = req.body;
      if (!stringerName) return res.status(400).json({ message: "Stringer name required" });
      const stringer = await storage.createSavedStringer(user.id, { stringerName, stringerAddress, stringerPlaceId, notes });
      res.status(201).json(stringer);
    } catch (e) { res.status(500).json({ message: "Failed to save stringer" }); }
  });

  app.patch("/api/account/stringers/:id", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const updated = await storage.updateSavedStringer(Number(req.params.id), user.id, { notes: req.body.notes });
      if (!updated) return res.status(404).json({ message: "Stringer not found" });
      res.json(updated);
    } catch (e) { res.status(500).json({ message: "Failed to update stringer" }); }
  });

  app.delete("/api/account/stringers/:id", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.deleteSavedStringer(Number(req.params.id), user.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: "Failed to remove stringer" }); }
  });

  // Cancel subscription
  app.post("/api/account/cancel-subscription", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user?.stripeSubscriptionId) return res.status(400).json({ message: "No active subscription" });
      const sub = await getStripe().subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
      res.json({ cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null });
    } catch (e) { res.status(500).json({ message: "Failed to cancel subscription" }); }
  });

  // Delete account
  app.delete("/api/account/delete", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      const [runs, savedRkts, savedStrs] = await Promise.all([
        storage.getRecommendationsByUserId(user.id),
        storage.getSavedRackets(user.id),
        storage.getSavedStringers(user.id),
      ]);
      const exportData = {
        profile: { email: user.email, firstName: user.firstName, lastName: user.lastName, tier: user.tier, createdAt: user.createdAt },
        recommendations: runs,
        savedRackets: savedRkts,
        savedStringers: savedStrs,
      };
      await storage.deleteUser(user.id);
      req.session.destroy(() => {});
      res.clearCookie("user_email");
      res.json({ success: true, exportData });
    } catch (e) { res.status(500).json({ message: "Failed to delete account" }); }
  });

  // --- Seed Data ---
  await seedDatabase();
  try {
    await seedAdminUser();
  } catch (err: any) {
    console.error("[seed] seedAdminUser failed (users table may not exist yet — run db:push):", err?.message ?? err);
  }

  // --- Chat Routes ---
  registerChatRoutes(app);

  return httpServer;
}

async function seedAdminUser() {
  await storage.upsertUser(ADMIN_EMAIL, { isAdmin: true, tier: "club" });
  console.log(`[seed] Admin user ensured: ${ADMIN_EMAIL}`);
}

async function seedDatabase() {
  const existing = await storage.getAllRackets();
  // Reseed if v3 sentinel missing (requires both Hevini + Slazenger brand).
  // Existing recommendation_runs are preserved (FK nullified).
  const hasHevini = existing.some(
    (r) => r.brand === "Hevini" && r.model === "Solution 1"
  );
  const hasV3 = existing.some((r) => r.brand === "Slazenger");
  if (existing.length > 0 && hasHevini && hasV3) return;
  if (existing.length > 0) {
    console.log(`[seed] Resetting ${existing.length} rackets with v3 spec list...`);
    await storage.resetRackets();
  }

  const rackets = [
    // ── HEVINI (featured) ──
    { brand: "Hevini", model: "Solution 1", headSize: 97, stringPattern: "16x19", weightUnstrung: 300, balance: "7 pts HL", stiffnessRa: 68, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 55, sourceUrl: "https://hevinisporting.com", level: "advanced" },

    // ── WILSON ──
    { brand: "Wilson", model: "Blade 98 16x19 v9", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 98 18x20 v9", headSize: 98, stringPattern: "18x20", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 100 v9", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 62, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 104 v9", headSize: 104, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Clash 100 v2", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "5 pts HL", stiffnessRa: 55, beamWidth: "24.5mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Wilson", model: "Clash 98 v2", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 55, beamWidth: "24mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Wilson", model: "Pro Staff 97 v14", headSize: 97, stringPattern: "16x19", weightUnstrung: 315, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Pro Staff 97L v14", headSize: 97, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 63, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Ultra 100 v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Shift 99 v1", headSize: 99, stringPattern: "16x20", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 59, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Burn 100 v5", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "27mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 98 v8 16x19", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "8 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Wilson", model: "Blade 98 v8 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 305, balance: "8 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Wilson", model: "Blade 100 v8", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "6 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Wilson", model: "Blade 104 v8", headSize: 104, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },
    { brand: "Wilson", model: "Clash 100 Pro v2", headSize: 100, stringPattern: "16x19", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 55, beamWidth: "24.5mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Wilson", model: "Clash 100L v2", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 55, beamWidth: "24.5mm", recTensionMin: 48, recTensionMax: 58, level: "beginner" },
    { brand: "Wilson", model: "Ultra 100L v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 277, balance: "2 pts HL", stiffnessRa: 68, beamWidth: "26mm", recTensionMin: 48, recTensionMax: 58, level: "beginner" },
    { brand: "Wilson", model: "Pro Staff 85 v14", headSize: 85, stringPattern: "16x19", weightUnstrung: 340, balance: "9 pts HL", stiffnessRa: 65, beamWidth: "20mm", recTensionMin: 50, recTensionMax: 62, level: "pro" },
    { brand: "Wilson", model: "Shift 99L v1", headSize: 99, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 46, recTensionMax: 56, level: "intermediate" },

    // ── BABOLAT ──
    { brand: "Babolat", model: "Pure Aero 98 2023", headSize: 98, stringPattern: "16x20", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 66, beamWidth: "21/23/22mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero 100 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "6 pts HL", stiffnessRa: 69, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero Rafa 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 70, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero Plus 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "6 pts HL", stiffnessRa: 69, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Drive 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 71, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Drive 98 2025", headSize: 98, stringPattern: "16x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 72, beamWidth: "21/23/21mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Drive Tour 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 315, balance: "4 pts HL", stiffnessRa: 71, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Strike 97 v4", headSize: 97, stringPattern: "18x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 68, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Strike 100 v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 67, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Strike VS 2022", headSize: 99, stringPattern: "18x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 71, beamWidth: "23-26mm", recTensionMin: 55, recTensionMax: 62, level: "intermediate" },
    { brand: "Babolat", model: "Pure Aero Team 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 69, beamWidth: "23-26mm", recTensionMin: 52, recTensionMax: 60, level: "beginner" },
    { brand: "Babolat", model: "Pure Aero Lite 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 270, balance: "0 pts HL", stiffnessRa: 69, beamWidth: "23-26mm", recTensionMin: 50, recTensionMax: 58, level: "beginner" },
    { brand: "Babolat", model: "Pure Drive Plus 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "4 pts HL", stiffnessRa: 72, beamWidth: "23-26mm", recTensionMin: 55, recTensionMax: 62, level: "intermediate" },
    { brand: "Babolat", model: "Pure Drive Team 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 70, beamWidth: "23-26mm", recTensionMin: 52, recTensionMax: 60, level: "beginner" },
    { brand: "Babolat", model: "Pure Drive Lite 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 270, balance: "0 pts HL", stiffnessRa: 70, beamWidth: "23-26mm", recTensionMin: 50, recTensionMax: 58, level: "beginner" },
    { brand: "Babolat", model: "Pure Strike Team v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "4 pts HL", stiffnessRa: 67, beamWidth: "21-24mm", recTensionMin: 48, recTensionMax: 57, level: "intermediate" },

    // ── HEAD ──
    { brand: "Head", model: "Speed MP 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Speed Pro 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Speed Pro Legend 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Speed MP L 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 46, recTensionMax: 55 },
    { brand: "Head", model: "Radical MP 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Radical Pro 2023", headSize: 98, stringPattern: "18x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 66, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Gravity MP 2023", headSize: 100, stringPattern: "16x20", weightUnstrung: 295, balance: "3 pts HL", stiffnessRa: 59, beamWidth: "21/23/22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Gravity Pro 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "21/23/22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Gravity Pro 2025", headSize: 100, stringPattern: "18x20", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 57, beamWidth: "21/23/22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Extreme MP 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "2 pts HL", stiffnessRa: 70, beamWidth: "25mm", recTensionMin: 52, recTensionMax: 62 },
    { brand: "Head", model: "Extreme MP L 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Head", model: "Boom MP 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Head", model: "Boom Pro 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 67, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Head", model: "Prestige MP 2023", headSize: 99, stringPattern: "18x19", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Prestige Pro 2023", headSize: 99, stringPattern: "18x20", weightUnstrung: 320, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Prestige Tour 2023", headSize: 99, stringPattern: "18x20", weightUnstrung: 335, balance: "9 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 58 },
    { brand: "Head", model: "Speed S 2024", headSize: 105, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60, level: "beginner" },
    { brand: "Head", model: "Gravity Pro 2023", headSize: 100, stringPattern: "16x20", weightUnstrung: 315, balance: "6 pts HL", stiffnessRa: 59, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
    { brand: "Head", model: "Gravity MP L 2023", headSize: 100, stringPattern: "16x20", weightUnstrung: 275, balance: "2 pts HL", stiffnessRa: 59, beamWidth: "23mm", recTensionMin: 46, recTensionMax: 56, level: "beginner" },
    { brand: "Head", model: "Prestige Mid 2023", headSize: 93, stringPattern: "18x20", weightUnstrung: 335, balance: "9 pts HL", stiffnessRa: 63, beamWidth: "19mm", recTensionMin: 52, recTensionMax: 62, level: "pro" },
    { brand: "Head", model: "Radical MP L 2023", headSize: 98, stringPattern: "18x20", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },

    // ── YONEX ──
    { brand: "Yonex", model: "EZONE 98 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "EZONE 98 2025", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 63, beamWidth: "24mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "EZONE 98 Tour 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 67, beamWidth: "23.5mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "EZONE 100 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 98 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22/25/22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 98 Tour 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 65, beamWidth: "22/25/22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 100 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "23/26/22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "Percept 97 2023", headSize: 97, stringPattern: "16x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "Percept 97H 2023", headSize: 97, stringPattern: "18x20", weightUnstrung: 320, balance: "7 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "Percept 100 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE Pro 97 2020", headSize: 97, stringPattern: "16x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 60, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE Pro 97D", headSize: 97, stringPattern: "16x19", weightUnstrung: 320, balance: "6 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 98L 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 285, balance: "4 pts HL", stiffnessRa: 66, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 60, level: "intermediate" },
    { brand: "Yonex", model: "VCORE 100L 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 66, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 58, level: "beginner" },
    { brand: "Yonex", model: "EZONE 98L 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 285, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 58, level: "intermediate" },
    { brand: "Yonex", model: "EZONE 100L 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 275, balance: "2 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 56, level: "beginner" },

    // ── DUNLOP ──
    { brand: "Dunlop", model: "CX 200 2021", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 200 Tour 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 310, balance: "7 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 200 LS", headSize: 98, stringPattern: "16x19", weightUnstrung: 285, balance: "3 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 400 Tour 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "FX 500 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "25mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "FX 500 Tour 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 66, beamWidth: "25mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "SX 300 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 200 2024", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "7 pts HL", stiffnessRa: 62, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Dunlop", model: "CX 200 Tour 18x20 2024", headSize: 98, stringPattern: "18x20", weightUnstrung: 310, balance: "8 pts HL", stiffnessRa: 62, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60, level: "pro" },
    { brand: "Dunlop", model: "CX 400 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Dunlop", model: "SX 300 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 70, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Dunlop", model: "SX 300 LS 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 270, balance: "0 pts HL", stiffnessRa: 70, beamWidth: "25mm", recTensionMin: 48, recTensionMax: 58, level: "beginner" },
    { brand: "Dunlop", model: "FX 500 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },

    // ── TECNIFIBRE ──
    { brand: "Tecnifibre", model: "TF40 305 16x19", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "TF40 315 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 315, balance: "8 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "T-Fight 300 Isoflex", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 57 },
    { brand: "Tecnifibre", model: "T-Fight 315 Isoflex", headSize: 98, stringPattern: "18x20", weightUnstrung: 315, balance: "6 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 57 },
    { brand: "Tecnifibre", model: "T-Fight 305 RS", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 63, beamWidth: "22mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "TF-X1 300", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "25mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "Tempo 298 Iga", headSize: 98, stringPattern: "16x19", weightUnstrung: 298, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "T-Fight Iso 305 2024", headSize: 98, stringPattern: "18x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "TF-X1 305 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },
    { brand: "Tecnifibre", model: "TF-X1 285 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 46, recTensionMax: 56, level: "beginner" },
    { brand: "Tecnifibre", model: "TF-X1 275 2022", headSize: 102, stringPattern: "16x19", weightUnstrung: 275, balance: "0 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 44, recTensionMax: 54, level: "beginner" },
    { brand: "Tecnifibre", model: "TF40 305 18x20 2022", headSize: 97, stringPattern: "18x20", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
    { brand: "Tecnifibre", model: "TF40 315 14x18 2022", headSize: 97, stringPattern: "14x18", weightUnstrung: 315, balance: "8 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "pro" },
    { brand: "Tecnifibre", model: "Tempo 298 IGA 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 298, balance: "4 pts HL", stiffnessRa: 66, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },

    // ── PRINCE ──
    { brand: "Prince", model: "Phantom 100X 18x20", headSize: 100, stringPattern: "18x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "20mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Prince", model: "ATS Textreme Tour 98", headSize: 98, stringPattern: "16x18", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "20mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Prince", model: "ATS Textreme Tour 100P", headSize: 100, stringPattern: "16x15", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "20mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Prince", model: "Ripstick 100 280", headSize: 100, stringPattern: "16x18", weightUnstrung: 280, balance: "3 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Prince", model: "Warrior 100 310", headSize: 100, stringPattern: "16x19", weightUnstrung: 310, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "24mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Prince", model: "Textreme Tour 100P 2022", headSize: 100, stringPattern: "16x18", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Prince", model: "Textreme Tour 95 2022", headSize: 95, stringPattern: "18x20", weightUnstrung: 320, balance: "8 pts HL", stiffnessRa: 64, beamWidth: "20mm", recTensionMin: 50, recTensionMax: 60, level: "pro" },
    { brand: "Prince", model: "Beast 100 2022", headSize: 100, stringPattern: "16x15", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 70, beamWidth: "26mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Prince", model: "Phantom 100P 2022", headSize: 100, stringPattern: "16x18", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 58, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },

    // ── SOLINCO ──
    { brand: "Solinco", model: "Whiteout 305", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 65, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Solinco", model: "Whiteout 305 XTD 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 305, balance: "7 pts HL", stiffnessRa: 65, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Solinco", model: "Blackout 300", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Solinco", model: "Whiteout 290", headSize: 98, stringPattern: "16x19", weightUnstrung: 290, balance: "3 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 55 },

    // ── VÖLKL ──
    { brand: "Völkl", model: "C10 Pro 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 330, balance: "9 pts HL", stiffnessRa: 58, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Völkl", model: "V-Cell 8 315", headSize: 100, stringPattern: "16x18", weightUnstrung: 315, balance: "7 pts HL", stiffnessRa: 60, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Völkl", model: "V-Cell 10 300", headSize: 98, stringPattern: "16x19", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Völkl", model: "V-Feel 8 300", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Volkl", model: "C10 Pro 2022", headSize: 98, stringPattern: "18x20", weightUnstrung: 319, balance: "8 pts HL", stiffnessRa: 59, beamWidth: "20mm", recTensionMin: 48, recTensionMax: 58, level: "pro" },
    { brand: "Volkl", model: "V-Cell 8 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },

    // ── PROKENNEX ──
    { brand: "ProKennex", model: "Ki Q+ Tour Pro 315", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "8 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "ProKennex", model: "Black Ace 300", headSize: 100, stringPattern: "16x20", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "ProKennex", model: "Ki Q+ 5 Pro 310", headSize: 100, stringPattern: "16x20", weightUnstrung: 310, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "ProKennex", model: "Ki 15 280", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "3 pts HL", stiffnessRa: 60, beamWidth: "24mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "ProKennex", model: "Ki Q+ Tour Pro 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "7 pts HL", stiffnessRa: 58, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
    { brand: "ProKennex", model: "Ki Q+ 5 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 265, balance: "0 pts HL", stiffnessRa: 56, beamWidth: "25mm", recTensionMin: 46, recTensionMax: 56, level: "beginner" },

    // ── DIADEM ──
    { brand: "Diadem", model: "Elevate 98 v3", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Diadem", model: "Nova FS 100", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "24mm", recTensionMin: 48, recTensionMax: 58 },

    // ── SLAZENGER ──
    { brand: "Slazenger", model: "Pro Braided 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },

    // ── GAMMA ──
    { brand: "Gamma", model: "RZR 98 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 64, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },

    // ── PACIFIC ──
    { brand: "Pacific", model: "X Force Pro 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 310, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
  ];

  for (const r of rackets) {
    await storage.createRacket(r as any);
  }
  console.log(`[seed] Inserted ${rackets.length} rackets (v3 spec list).`);
}

