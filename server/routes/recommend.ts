import { Router } from "express";
import { z } from "zod";
import { insertFeedbackSchema, onboardingInputsSchema } from "@shared/schema";
import { asyncHandler, loadUser, rateLimit } from "../auth";
import { storage } from "../storage";
import { confidenceFor, generateRecommendation } from "../recommend-engine";
import { parseBody, parseId } from "./util";
import { recordRecommendationSignals } from "../b2b";

export const recommendRouter = Router();

// ─── Catalog ────────────────────────────────────────────────────────────────

recommendRouter.get(
  "/api/rackets/search",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.slice(0, 80) : "";
    res.json(q.trim() ? await storage.searchRackets(q) : await storage.getAllRackets());
  }),
);

recommendRouter.get(
  "/api/rackets/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const racket = id ? await storage.getRacket(id) : undefined;
    if (!racket) return res.status(404).json({ message: "Racket not found" });
    res.json(racket);
  }),
);

// ─── Recommendations ────────────────────────────────────────────────────────

// AI calls cost money: anonymous visitors get a few per hour, members more.
const anonLimit = rateLimit({ windowMs: 60 * 60_000, max: 8 });
const memberLimit = rateLimit({ windowMs: 60 * 60_000, max: 40, key: (req) => `u${req.user?.id}` });

recommendRouter.post(
  "/api/recommend",
  asyncHandler(async (req, res, next) => {
    const user = await loadUser(req);
    (user ? memberLimit : anonLimit)(req, res, next);
  }),
  asyncHandler(async (req, res) => {
    const input = parseBody(onboardingInputsSchema, req.body, res);
    if (!input) return;
    const user = req.user;
    const racket = input.racketId ? await storage.getRacket(input.racketId) : undefined;
    let savedRacketId: number | null = null;
    if (input.savedRacketId && user) {
      const saved = await storage.getSavedRacket(input.savedRacketId, user.id);
      if (saved) savedRacketId = saved.id;
    }
    const confidence = confidenceFor(input);
    const { output, fallback } = await generateRecommendation(input, racket);
    const run = await storage.createRecommendationRun({
      racketId: racket?.id ?? null,
      racketLabel: racket ? `${racket.brand} ${racket.model}` : null,
      savedRacketId,
      sessionId: req.sessionID ?? null,
      userId: user?.id ?? null,
      inputsJson: input,
      outputJson: output,
      confidence,
    });
    if (!user) {
      // Remember anonymous runs so they can be claimed into history after sign-up.
      req.session.anonRuns = [...(req.session.anonRuns ?? []), run.id].slice(-10);
    }
    // Analytics only, after the pick is stored; it reads the output and never changes it.
    await recordRecommendationSignals(output, input, user?.id ?? req.sessionID ?? null, racket?.brand ?? null);
    res.status(201).json({ runId: run.id, recommendation: output, confidence, fallback });
  }),
);

recommendRouter.get(
  "/api/recommendation-runs/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const run = id ? await storage.getRecommendationRun(id) : undefined;
    if (!run) return res.status(404).json({ message: "Recommendation not found" });
    const user = await loadUser(req);
    const racket = run.racketId ? await storage.getRacket(run.racketId) : undefined;
    res.json({
      runId: run.id,
      recommendation: run.outputJson,
      confidence: run.confidence,
      createdAt: run.createdAt,
      racket: racket ? { id: racket.id, brand: racket.brand, model: racket.model, recTensionMin: racket.recTensionMin, recTensionMax: racket.recTensionMax } : null,
      racketLabel: run.racketLabel ?? (racket ? `${racket.brand} ${racket.model}` : null),
      inputs: run.inputsJson,
      isOwner: !!user && run.userId === user.id,
      savedRacketId: run.userId && user && run.userId === user.id ? run.savedRacketId : null,
    });
  }),
);

// ─── Feedback ───────────────────────────────────────────────────────────────

recommendRouter.post(
  "/api/feedback",
  rateLimit({ windowMs: 60 * 60_000, max: 30 }),
  asyncHandler(async (req, res) => {
    const schema = insertFeedbackSchema.extend({
      ratingPower: z.number().int().min(1).max(5).nullable().optional(),
      ratingControl: z.number().int().min(1).max(5).nullable().optional(),
      ratingComfort: z.number().int().min(1).max(5).nullable().optional(),
      durabilityHours: z.number().min(0).max(1000).nullable().optional(),
      comments: z.string().max(2000).nullable().optional(),
    });
    const data = parseBody(schema, req.body, res);
    if (!data) return;
    if (!(await storage.getRecommendationRun(data.recommendationRunId))) {
      return res.status(404).json({ message: "Recommendation not found" });
    }
    res.status(201).json(await storage.createFeedback(data));
  }),
);
