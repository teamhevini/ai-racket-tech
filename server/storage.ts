import { db } from "./db";
import {
  rackets,
  recommendationRuns,
  feedback,
  users,
  savedRackets,
  savedStringers,
  stringJobs,
  conversations,
  messages,
  type Racket,
  type InsertRacket,
  type RecommendationRun,
  type InsertRun,
  type Feedback,
  type InsertFeedback,
  type User,
  type SavedRacket,
  type SavedStringer,
  type StringJob,
  type UserTier,
  type Conversation,
  type Message,
} from "@shared/schema";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

type SavedRacketData = Partial<Omit<SavedRacket, "id" | "userId" | "createdAt">> & { nickname?: string };
type SavedStringerData = Partial<Omit<SavedStringer, "id" | "userId" | "createdAt">> & { stringerName?: string };
type StringJobData = Omit<StringJob, "id" | "userId" | "savedRacketId" | "createdAt">;

const featuredFirst = sql`(${rackets.brand} = 'Hevini') DESC, ${rackets.brand}, ${rackets.model}`;

export const storage = {
  // ─── Catalog ──────────────────────────────────────────────────────────────
  async getRacket(id: number): Promise<Racket | undefined> {
    const [row] = await db.select().from(rackets).where(eq(rackets.id, id));
    return row;
  },

  async searchRackets(query: string): Promise<Racket[]> {
    const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    const conditions = terms.map((t) => or(ilike(rackets.brand, `%${t}%`), ilike(rackets.model, `%${t}%`)));
    return db
      .select()
      .from(rackets)
      .where(and(...conditions))
      .orderBy(featuredFirst)
      .limit(20);
  },

  async getAllRackets(): Promise<Racket[]> {
    return db.select().from(rackets).orderBy(featuredFirst).limit(500);
  },

  async findRacket(brand: string, model: string): Promise<Racket | undefined> {
    const [row] = await db
      .select()
      .from(rackets)
      .where(and(eq(rackets.brand, brand), eq(rackets.model, model)))
      .limit(1);
    return row;
  },

  async createRacket(data: InsertRacket): Promise<Racket> {
    const [row] = await db.insert(rackets).values(data).returning();
    return row;
  },

  async updateRacket(id: number, data: Partial<InsertRacket>): Promise<void> {
    await db.update(rackets).set(data).where(eq(rackets.id, id));
  },

  // ─── Recommendation runs ──────────────────────────────────────────────────
  async createRecommendationRun(data: InsertRun): Promise<RecommendationRun> {
    const [row] = await db.insert(recommendationRuns).values(data).returning();
    return row;
  },

  async getRecommendationRun(id: number): Promise<RecommendationRun | undefined> {
    const [row] = await db.select().from(recommendationRuns).where(eq(recommendationRuns.id, id));
    return row;
  },

  async getRecommendationsByUserId(userId: number, limit = 100): Promise<RecommendationRun[]> {
    return db
      .select()
      .from(recommendationRuns)
      .where(eq(recommendationRuns.userId, userId))
      .orderBy(desc(recommendationRuns.createdAt), desc(recommendationRuns.id))
      .limit(limit);
  },

  async claimRecommendationRun(id: number, userId: number): Promise<void> {
    await db
      .update(recommendationRuns)
      .set({ userId })
      .where(and(eq(recommendationRuns.id, id), sql`${recommendationRuns.userId} IS NULL`));
  },

  async deleteRecommendationRun(id: number, userId: number): Promise<void> {
    await db
      .delete(recommendationRuns)
      .where(and(eq(recommendationRuns.id, id), eq(recommendationRuns.userId, userId)));
  },

  // ─── Feedback ─────────────────────────────────────────────────────────────
  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [row] = await db.insert(feedback).values(data).returning();
    return row;
  },

  // ─── Users ────────────────────────────────────────────────────────────────
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return row;
  },

  async getUserById(id: number): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  },

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return row;
  },

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  },

  async createUser(data: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<User> {
    const [row] = await db
      .insert(users)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return row;
  },

  async updateUser(id: number, data: Partial<Omit<User, "id" | "createdAt">>): Promise<User> {
    const [row] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row;
  },

  async ensureAdmin(email: string): Promise<void> {
    const existing = await this.getUserByEmail(email);
    if (existing) {
      if (!existing.isAdmin) await this.updateUser(existing.id, { isAdmin: true });
      return;
    }
    await db.insert(users).values({ email: email.toLowerCase(), isAdmin: true, tier: "club" });
  },

  async setUserTier(id: number, tier: UserTier): Promise<void> {
    await this.updateUser(id, { tier });
  },

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  },

  // ─── Saved rackets (my bag) ───────────────────────────────────────────────
  async getSavedRackets(userId: number): Promise<SavedRacket[]> {
    return db
      .select()
      .from(savedRackets)
      .where(eq(savedRackets.userId, userId))
      .orderBy(asc(savedRackets.createdAt), asc(savedRackets.id));
  },

  async getSavedRacket(id: number, userId: number): Promise<SavedRacket | undefined> {
    const [row] = await db
      .select()
      .from(savedRackets)
      .where(and(eq(savedRackets.id, id), eq(savedRackets.userId, userId)));
    return row;
  },

  async countSavedRackets(userId: number): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(savedRackets)
      .where(eq(savedRackets.userId, userId));
    return row?.n ?? 0;
  },

  async createSavedRacket(userId: number, data: SavedRacketData & { nickname: string }): Promise<SavedRacket> {
    const [row] = await db.insert(savedRackets).values({ ...data, userId }).returning();
    return row;
  },

  async updateSavedRacket(id: number, userId: number, data: SavedRacketData): Promise<SavedRacket | undefined> {
    const [row] = await db
      .update(savedRackets)
      .set(data)
      .where(and(eq(savedRackets.id, id), eq(savedRackets.userId, userId)))
      .returning();
    return row;
  },

  async deleteSavedRacket(id: number, userId: number): Promise<void> {
    await db.delete(savedRackets).where(and(eq(savedRackets.id, id), eq(savedRackets.userId, userId)));
  },

  // ─── Saved stringers ──────────────────────────────────────────────────────
  async getSavedStringers(userId: number): Promise<SavedStringer[]> {
    return db
      .select()
      .from(savedStringers)
      .where(eq(savedStringers.userId, userId))
      .orderBy(asc(savedStringers.createdAt), asc(savedStringers.id));
  },

  async getSavedStringer(id: number, userId: number): Promise<SavedStringer | undefined> {
    const [row] = await db
      .select()
      .from(savedStringers)
      .where(and(eq(savedStringers.id, id), eq(savedStringers.userId, userId)));
    return row;
  },

  async createSavedStringer(userId: number, data: SavedStringerData & { stringerName: string }): Promise<SavedStringer> {
    const [row] = await db.insert(savedStringers).values({ ...data, userId }).returning();
    return row;
  },

  async updateSavedStringer(id: number, userId: number, data: SavedStringerData): Promise<SavedStringer | undefined> {
    const [row] = await db
      .update(savedStringers)
      .set(data)
      .where(and(eq(savedStringers.id, id), eq(savedStringers.userId, userId)))
      .returning();
    return row;
  },

  async deleteSavedStringer(id: number, userId: number): Promise<void> {
    await db.delete(savedStringers).where(and(eq(savedStringers.id, id), eq(savedStringers.userId, userId)));
  },

  // ─── String jobs (racket history) ─────────────────────────────────────────
  async getStringJobsForRacket(savedRacketId: number, userId: number): Promise<StringJob[]> {
    return db
      .select()
      .from(stringJobs)
      .where(and(eq(stringJobs.savedRacketId, savedRacketId), eq(stringJobs.userId, userId)))
      .orderBy(desc(stringJobs.strungAt), desc(stringJobs.id));
  },

  async getStringJobsForUser(userId: number): Promise<StringJob[]> {
    return db
      .select()
      .from(stringJobs)
      .where(eq(stringJobs.userId, userId))
      .orderBy(desc(stringJobs.strungAt), desc(stringJobs.id));
  },

  /** Most recent job for each of the given rackets, keyed by racket id. */
  async getLatestJobs(userId: number, racketIds: number[]): Promise<Map<number, StringJob>> {
    const result = new Map<number, StringJob>();
    if (racketIds.length === 0) return result;
    const rows = await db
      .select()
      .from(stringJobs)
      .where(and(eq(stringJobs.userId, userId), inArray(stringJobs.savedRacketId, racketIds)))
      .orderBy(desc(stringJobs.strungAt), desc(stringJobs.id));
    for (const row of rows) if (!result.has(row.savedRacketId)) result.set(row.savedRacketId, row);
    return result;
  },

  async countJobsByRacket(userId: number): Promise<Map<number, number>> {
    const rows = await db
      .select({ id: stringJobs.savedRacketId, n: sql<number>`count(*)::int` })
      .from(stringJobs)
      .where(eq(stringJobs.userId, userId))
      .groupBy(stringJobs.savedRacketId);
    return new Map(rows.map((r) => [r.id, r.n]));
  },

  async getStringJob(id: number, userId: number): Promise<StringJob | undefined> {
    const [row] = await db
      .select()
      .from(stringJobs)
      .where(and(eq(stringJobs.id, id), eq(stringJobs.userId, userId)));
    return row;
  },

  async createStringJob(userId: number, savedRacketId: number, data: StringJobData): Promise<StringJob> {
    const [row] = await db
      .insert(stringJobs)
      .values({ ...data, userId, savedRacketId })
      .returning();
    return row;
  },

  async updateStringJob(id: number, userId: number, data: Partial<StringJobData>): Promise<StringJob | undefined> {
    const [row] = await db
      .update(stringJobs)
      .set(data)
      .where(and(eq(stringJobs.id, id), eq(stringJobs.userId, userId)))
      .returning();
    return row;
  },

  async deleteStringJob(id: number, userId: number): Promise<void> {
    await db.delete(stringJobs).where(and(eq(stringJobs.id, id), eq(stringJobs.userId, userId)));
  },

  // ─── Reminder email candidates ────────────────────────────────────────────
  async getUsersWithEmailReminders(): Promise<User[]> {
    return db.select().from(users).where(eq(users.reminderEnabled, true));
  },

  // ─── Chat ─────────────────────────────────────────────────────────────────
  async getConversations(userId: number): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  },

  async getConversation(id: number, userId: number): Promise<Conversation | undefined> {
    const [row] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return row;
  },

  async createConversation(userId: number, title: string): Promise<Conversation> {
    const [row] = await db.insert(conversations).values({ userId, title }).returning();
    return row;
  },

  async touchConversation(id: number): Promise<void> {
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));
  },

  async deleteConversation(id: number, userId: number): Promise<void> {
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  },

  async getMessages(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt), asc(messages.id));
  },

  async createMessage(conversationId: number, role: "user" | "assistant", content: string): Promise<Message> {
    const [row] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return row;
  },
};

export type Storage = typeof storage;
