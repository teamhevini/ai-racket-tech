import { db } from "./db";
import {
  rackets,
  recommendationRuns,
  feedback,
  users,
  savedRackets,
  savedStringers,
  type Racket,
  type InsertRacket,
  type RecommendationRun,
  type InsertRun,
  type Feedback,
  type InsertFeedback,
  type User,
  type SavedRacket,
  type SavedStringer,
} from "@shared/schema";
import { eq, ilike, or, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Rackets
  getRacket(id: number): Promise<Racket | undefined>;
  searchRackets(query: string): Promise<Racket[]>;
  createRacket(racket: InsertRacket): Promise<Racket>;
  getAllRackets(): Promise<Racket[]>;
  resetRackets(): Promise<void>;

  // Runs
  createRecommendationRun(run: InsertRun): Promise<RecommendationRun>;
  getRecommendationRun(id: number): Promise<RecommendationRun | undefined>;
  getRecommendationsByUserId(userId: number): Promise<RecommendationRun[]>;

  // Feedback
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(email: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User>;
  upsertUser(email: string, data: Partial<Omit<User, "id" | "email" | "createdAt">>): Promise<User>;
  updateUserProfile(id: number, data: { firstName?: string; lastName?: string; email?: string }): Promise<User>;
  updateUserPassword(id: number, passwordHash: string): Promise<void>;
  updateUserReminders(id: number, data: { reminderEnabled: boolean; reminderFrequencyWeeks: number; lastRestrungAt: Date | null }): Promise<void>;
  setUserTier(email: string, tier: "free" | "pro" | "club"): Promise<void>;
  setUserAdmin(id: number, isAdmin: boolean): Promise<void>;
  setUserTierById(id: number, tier: "free" | "pro" | "club"): Promise<void>;
  deleteUser(id: number): Promise<void>;

  // Saved Rackets
  getSavedRackets(userId: number): Promise<SavedRacket[]>;
  createSavedRacket(userId: number, data: Omit<SavedRacket, "id" | "userId" | "createdAt">): Promise<SavedRacket>;
  updateSavedRacket(id: number, userId: number, data: Partial<Omit<SavedRacket, "id" | "userId" | "createdAt">>): Promise<SavedRacket | undefined>;
  deleteSavedRacket(id: number, userId: number): Promise<void>;

  // Saved Stringers
  getSavedStringers(userId: number): Promise<SavedStringer[]>;
  createSavedStringer(userId: number, data: Omit<SavedStringer, "id" | "userId" | "createdAt">): Promise<SavedStringer>;
  updateSavedStringer(id: number, userId: number, data: Partial<Omit<SavedStringer, "id" | "userId" | "createdAt">>): Promise<SavedStringer | undefined>;
  deleteSavedStringer(id: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getRacket(id: number): Promise<Racket | undefined> {
    const [racket] = await db.select().from(rackets).where(eq(rackets.id, id));
    return racket;
  }

  async searchRackets(query: string): Promise<Racket[]> {
    const search = `%${query}%`;
    return await db
      .select()
      .from(rackets)
      .where(or(ilike(rackets.brand, search), ilike(rackets.model, search)))
      .orderBy(sql`(${rackets.brand} = 'Hevini') DESC, ${rackets.brand}, ${rackets.model}`)
      .limit(20);
  }

  async resetRackets(): Promise<void> {
    await db.execute(sql`UPDATE recommendation_runs SET racket_id = NULL`);
    await db.execute(sql`DELETE FROM rackets`);
    await db.execute(sql`ALTER SEQUENCE rackets_id_seq RESTART WITH 1`);
  }

  async createRacket(insertRacket: InsertRacket): Promise<Racket> {
    const [racket] = await db.insert(rackets).values(insertRacket).returning();
    return racket;
  }

  async getAllRackets(): Promise<Racket[]> {
    return await db.select().from(rackets).limit(100);
  }

  async createRecommendationRun(insertRun: InsertRun): Promise<RecommendationRun> {
    const [run] = await db.insert(recommendationRuns).values(insertRun).returning();
    return run;
  }

  async getRecommendationRun(id: number): Promise<RecommendationRun | undefined> {
    const [run] = await db.select().from(recommendationRuns).where(eq(recommendationRuns.id, id));
    return run;
  }

  async getRecommendationsByUserId(userId: number): Promise<RecommendationRun[]> {
    return await db
      .select()
      .from(recommendationRuns)
      .where(eq(recommendationRuns.userId, userId))
      .orderBy(desc(recommendationRuns.createdAt))
      .limit(50);
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [fb] = await db.insert(feedback).values(insertFeedback).returning();
    return fb;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async createUser(email: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User> {
    const [user] = await db.insert(users).values({ email, passwordHash, firstName, lastName }).returning();
    return user;
  }

  async upsertUser(email: string, data: Partial<Omit<User, "id" | "email" | "createdAt">>): Promise<User> {
    const existing = await this.getUserByEmail(email);
    if (existing) {
      const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.email, email)).returning();
      return updated;
    }
    const [created] = await db.insert(users).values({ email, ...data }).returning();
    return created;
  }

  async updateUserProfile(id: number, data: { firstName?: string; lastName?: string; email?: string }): Promise<User> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserReminders(id: number, data: { reminderEnabled: boolean; reminderFrequencyWeeks: number; lastRestrungAt: Date | null }): Promise<void> {
    await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async setUserAdmin(id: number, isAdmin: boolean): Promise<void> {
    await db.update(users).set({ isAdmin, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async setUserTierById(id: number, tier: "free" | "pro" | "club"): Promise<void> {
    await db.update(users).set({ tier, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async setUserTier(email: string, tier: "free" | "pro" | "club"): Promise<void> {
    await this.upsertUser(email, { tier });
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // --- Saved Rackets ---

  async getSavedRackets(userId: number): Promise<SavedRacket[]> {
    return await db.select().from(savedRackets).where(eq(savedRackets.userId, userId)).orderBy(savedRackets.createdAt);
  }

  async createSavedRacket(userId: number, data: Omit<SavedRacket, "id" | "userId" | "createdAt">): Promise<SavedRacket> {
    const [row] = await db.insert(savedRackets).values({ userId, ...data }).returning();
    return row;
  }

  async updateSavedRacket(id: number, userId: number, data: Partial<Omit<SavedRacket, "id" | "userId" | "createdAt">>): Promise<SavedRacket | undefined> {
    const [row] = await db
      .update(savedRackets)
      .set(data)
      .where(sql`${savedRackets.id} = ${id} AND ${savedRackets.userId} = ${userId}`)
      .returning();
    return row;
  }

  async deleteSavedRacket(id: number, userId: number): Promise<void> {
    await db.delete(savedRackets).where(sql`${savedRackets.id} = ${id} AND ${savedRackets.userId} = ${userId}`);
  }

  // --- Saved Stringers ---

  async getSavedStringers(userId: number): Promise<SavedStringer[]> {
    return await db.select().from(savedStringers).where(eq(savedStringers.userId, userId)).orderBy(savedStringers.createdAt);
  }

  async createSavedStringer(userId: number, data: Omit<SavedStringer, "id" | "userId" | "createdAt">): Promise<SavedStringer> {
    const [row] = await db.insert(savedStringers).values({ userId, ...data }).returning();
    return row;
  }

  async updateSavedStringer(id: number, userId: number, data: Partial<Omit<SavedStringer, "id" | "userId" | "createdAt">>): Promise<SavedStringer | undefined> {
    const [row] = await db
      .update(savedStringers)
      .set(data)
      .where(sql`${savedStringers.id} = ${id} AND ${savedStringers.userId} = ${userId}`)
      .returning();
    return row;
  }

  async deleteSavedStringer(id: number, userId: number): Promise<void> {
    await db.delete(savedStringers).where(sql`${savedStringers.id} = ${id} AND ${savedStringers.userId} = ${userId}`);
  }
}

export const storage = new DatabaseStorage();
