import { db } from "./db";
import {
  rackets,
  recommendationRuns,
  feedback,
  users,
  type Racket,
  type InsertRacket,
  type RecommendationRun,
  type InsertRun,
  type Feedback,
  type InsertFeedback,
  type User,
} from "@shared/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

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

  // Feedback
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(email: string, data: Partial<Omit<User, "id" | "email" | "createdAt">>): Promise<User>;
  setUserTier(email: string, tier: "free" | "pro" | "club"): Promise<void>;
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
    const [run] = await db
      .select()
      .from(recommendationRuns)
      .where(eq(recommendationRuns.id, id));
    return run;
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [fb] = await db.insert(feedback).values(insertFeedback).returning();
    return fb;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async upsertUser(
    email: string,
    data: Partial<Omit<User, "id" | "email" | "createdAt">>
  ): Promise<User> {
    const existing = await this.getUserByEmail(email);
    if (existing) {
      const [updated] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(users)
      .values({ email, ...data })
      .returning();
    return created;
  }

  async setUserTier(email: string, tier: "free" | "pro" | "club"): Promise<void> {
    await this.upsertUser(email, { tier });
  }
}

export const storage = new DatabaseStorage();
