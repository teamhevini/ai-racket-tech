import { Router } from "express";
import {
  savedRacketInputSchema,
  stringJobInputSchema,
  type SavedRacket,
  type StringJob,
  type User,
} from "@shared/schema";
import { reminderState } from "@shared/reminders";
import { FREE_HISTORY_LIMIT, FREE_RACKET_LIMIT } from "@shared/tiers";
import { asyncHandler, currentUser, requireAuth } from "../auth";
import { storage } from "../storage";
import { buildIcs } from "../ics";
import { parseBody, parseId } from "./util";

export const bagRouter = Router();
bagRouter.use("/api/bag", requireAuth);

function racketSummary(racket: SavedRacket, latest: StringJob | undefined, jobCount: number) {
  const reminder = reminderState({
    hoursPerWeek: racket.hoursPerWeek,
    restringIntervalDays: racket.restringIntervalDays,
    mains: latest?.mains,
    crosses: latest?.crosses,
    lastStrungAt: latest?.strungAt ?? null,
  });
  return { ...racket, latestJob: latest ?? null, jobCount, reminder };
}

/**
 * v1 stored one "last restrung" date and frequency on the user. The first time a
 * v1 user opens their bag, move that onto their first racket as a history entry.
 */
async function migrateLegacyReminder(user: User, rackets: SavedRacket[]): Promise<boolean> {
  if (!user.lastRestrungAt || rackets.length === 0) return false;
  const counts = await storage.countJobsByRacket(user.id);
  if (counts.size === 0) {
    const first = rackets[0];
    await storage.createStringJob(user.id, first.id, {
      strungAt: user.lastRestrungAt,
      stringerId: null,
      recommendationRunId: null,
      mains: null,
      crosses: null,
      gauge: null,
      tensionMains: null,
      tensionCrosses: null,
      price: null,
      rating: null,
      notes: "Imported from your earlier reminder settings",
    });
    if (user.reminderFrequencyWeeks && !first.restringIntervalDays) {
      await storage.updateSavedRacket(first.id, user.id, { restringIntervalDays: user.reminderFrequencyWeeks * 7 });
    }
  }
  await storage.updateUser(user.id, { lastRestrungAt: null });
  return true;
}

bagRouter.get(
  "/api/bag",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    let rackets = await storage.getSavedRackets(user.id);
    if (await migrateLegacyReminder(user, rackets)) rackets = await storage.getSavedRackets(user.id);
    const ids = rackets.map((r) => r.id);
    const [latest, counts] = await Promise.all([storage.getLatestJobs(user.id, ids), storage.countJobsByRacket(user.id)]);
    const ent = req.entitlements!;
    res.json({
      rackets: rackets.map((r) => racketSummary(r, latest.get(r.id), counts.get(r.id) ?? 0)),
      limit: ent.unlimitedRackets ? null : FREE_RACKET_LIMIT,
      emailReminders: user.reminderEnabled,
    });
  }),
);

bagRouter.post(
  "/api/bag/rackets",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(savedRacketInputSchema, req.body, res);
    if (!data) return;
    if (!req.entitlements!.unlimitedRackets && (await storage.countSavedRackets(user.id)) >= FREE_RACKET_LIMIT) {
      return res.status(403).json({
        message: `The free plan holds ${FREE_RACKET_LIMIT} rackets. Upgrade to add more.`,
        upgrade: true,
      });
    }
    const racket = await storage.createSavedRacket(user.id, data);
    res.status(201).json(racketSummary(racket, undefined, 0));
  }),
);

bagRouter.get(
  "/api/bag/rackets/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const racket = id ? await storage.getSavedRacket(id, user.id) : undefined;
    if (!racket) return res.status(404).json({ message: "Racket not found" });

    const [jobs, stringers, runs] = await Promise.all([
      storage.getStringJobsForRacket(racket.id, user.id),
      storage.getSavedStringers(user.id),
      storage.getRecommendationsByUserId(user.id),
    ]);
    const fullHistory = req.entitlements!.fullHistory;
    const visible = fullHistory ? jobs : jobs.slice(0, FREE_HISTORY_LIMIT);
    const stringerById = new Map(stringers.map((s) => [s.id, s]));
    res.json({
      racket: racketSummary(racket, jobs[0], jobs.length),
      history: visible.map((j) => ({ ...j, stringer: j.stringerId ? stringerById.get(j.stringerId) ?? null : null })),
      totalJobs: jobs.length,
      hiddenJobs: jobs.length - visible.length,
      fullHistory,
      recommendations: runs
        .filter((r) => r.savedRacketId === racket.id)
        .map((r) => ({ id: r.id, createdAt: r.createdAt, confidence: r.confidence, output: r.outputJson })),
      stats: historyStats(jobs),
    });
  }),
);

function historyStats(jobs: StringJob[]) {
  if (jobs.length === 0) return null;
  const sorted = [...jobs].sort((a, b) => +new Date(a.strungAt) - +new Date(b.strungAt));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((+new Date(sorted[i].strungAt) - +new Date(sorted[i - 1].strungAt)) / 86_400_000);
  }
  const spent = jobs.reduce((sum, j) => sum + (j.price ?? 0), 0);
  const tensions = jobs.map((j) => j.tensionMains).filter((t): t is number => typeof t === "number");
  return {
    restrings: jobs.length,
    averageDaysBetween: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    totalSpent: spent > 0 ? Math.round(spent * 100) / 100 : null,
    averageTension: tensions.length ? Math.round((tensions.reduce((a, b) => a + b, 0) / tensions.length) * 10) / 10 : null,
    firstStrungAt: sorted[0].strungAt,
  };
}

bagRouter.patch(
  "/api/bag/rackets/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const data = parseBody(savedRacketInputSchema.partial(), req.body, res);
    if (!data) return;
    const updated = id ? await storage.updateSavedRacket(id, user.id, data) : undefined;
    if (!updated) return res.status(404).json({ message: "Racket not found" });
    const jobs = await storage.getStringJobsForRacket(updated.id, user.id);
    res.json(racketSummary(updated, jobs[0], jobs.length));
  }),
);

bagRouter.delete(
  "/api/bag/rackets/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    if (id) await storage.deleteSavedRacket(id, user.id);
    res.json({ success: true });
  }),
);

async function checkStringerAndRun(userId: number, stringerId?: number | null, runId?: number | null) {
  if (stringerId && !(await storage.getSavedStringer(stringerId, userId))) return "That stringer isn't in your list";
  if (runId) {
    const run = await storage.getRecommendationRun(runId);
    if (!run || run.userId !== userId) return "That recommendation isn't yours";
  }
  return null;
}

bagRouter.post(
  "/api/bag/rackets/:id/jobs",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const racket = id ? await storage.getSavedRacket(id, user.id) : undefined;
    if (!racket) return res.status(404).json({ message: "Racket not found" });
    const data = parseBody(stringJobInputSchema, req.body, res);
    if (!data) return;
    const problem = await checkStringerAndRun(user.id, data.stringerId, data.recommendationRunId);
    if (problem) return res.status(400).json({ message: problem });
    const job = await storage.createStringJob(user.id, racket.id, {
      ...data,
      stringerId: data.stringerId ?? null,
      recommendationRunId: data.recommendationRunId ?? null,
    });
    // A fresh set of strings resets the reminder clock.
    await storage.updateSavedRacket(racket.id, user.id, { lastReminderSentAt: null });
    res.status(201).json(job);
  }),
);

bagRouter.patch(
  "/api/bag/jobs/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const data = parseBody(stringJobInputSchema.partial(), req.body, res);
    if (!data) return;
    const problem = await checkStringerAndRun(user.id, data.stringerId, data.recommendationRunId);
    if (problem) return res.status(400).json({ message: problem });
    const updated = id ? await storage.updateStringJob(id, user.id, data) : undefined;
    if (!updated) return res.status(404).json({ message: "History entry not found" });
    res.json(updated);
  }),
);

bagRouter.delete(
  "/api/bag/jobs/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    if (id) await storage.deleteStringJob(id, user.id);
    res.json({ success: true });
  }),
);

/** Calendar file so the reminder lands in the player's own calendar app. */
bagRouter.get(
  "/api/bag/rackets/:id/reminder.ics",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const racket = id ? await storage.getSavedRacket(id, user.id) : undefined;
    if (!racket) return res.status(404).json({ message: "Racket not found" });
    const jobs = await storage.getStringJobsForRacket(racket.id, user.id);
    const state = reminderState({
      hoursPerWeek: racket.hoursPerWeek,
      restringIntervalDays: racket.restringIntervalDays,
      mains: jobs[0]?.mains,
      crosses: jobs[0]?.crosses,
      lastStrungAt: jobs[0]?.strungAt ?? null,
    });
    if (!state.dueAt) return res.status(400).json({ message: "Log a restring first so we know when the next one is due." });
    const ics = buildIcs({
      uid: `racket-${racket.id}-${state.dueAt.getTime()}@10is.app`,
      date: state.dueAt,
      title: `Restring ${racket.nickname}`,
      description: `Your strings in ${racket.nickname} are due for a restring (every ${state.intervalDays} days). Log it in 10IS when it's done.`,
      url: `${process.env.APP_URL ?? "https://10is.app"}/bag/${racket.id}`,
    });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="restring-${racket.id}.ics"`);
    res.send(ics);
  }),
);
