import { eq, ilike, or } from 'drizzle-orm';
import { db } from './db';
import {
  rackets, recommendationRuns, feedback, conversations, messages,
  type InsertRacket, type Racket, type RecommendationRun, type Feedback,
  type Conversation, type Message,
} from '../shared/schema';

// ── Rackets ──────────────────────────────────────────────────────────────────

export async function searchRackets(q: string): Promise<Racket[]> {
  if (!q.trim()) {
    return db.select().from(rackets).limit(50);
  }
  return db
    .select()
    .from(rackets)
    .where(or(ilike(rackets.brand, `%${q}%`), ilike(rackets.model, `%${q}%`)))
    .limit(30);
}

export async function getRacketById(id: number): Promise<Racket | undefined> {
  const rows = await db.select().from(rackets).where(eq(rackets.id, id)).limit(1);
  return rows[0];
}

// ── Recommendation runs ───────────────────────────────────────────────────────

export async function createRecommendationRun(data: {
  racketId?: number;
  inputJson: unknown;
  outputJson: unknown;
  confidence: string;
}): Promise<RecommendationRun> {
  const rows = await db
    .insert(recommendationRuns)
    .values({
      racketId: data.racketId ?? null,
      inputJson: data.inputJson as any,
      outputJson: data.outputJson as any,
      confidence: data.confidence,
    })
    .returning();
  return rows[0];
}

export async function getRecommendationRun(id: number): Promise<RecommendationRun | undefined> {
  const rows = await db
    .select()
    .from(recommendationRuns)
    .where(eq(recommendationRuns.id, id))
    .limit(1);
  return rows[0];
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function createFeedback(data: {
  recommendationRunId: number;
  ratingPower?: number;
  ratingControl?: number;
  ratingComfort?: number;
  durabilityHours?: number;
  comments?: string;
}): Promise<Feedback> {
  const rows = await db.insert(feedback).values(data).returning();
  return rows[0];
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function createConversation(title?: string): Promise<Conversation> {
  const rows = await db.insert(conversations).values({ title: title ?? 'Chat' }).returning();
  return rows[0];
}

export async function getConversationMessages(conversationId: number): Promise<Message[]> {
  return db.select().from(messages).where(eq(messages.conversationId, conversationId));
}

export async function addMessage(data: {
  conversationId: number;
  role: string;
  content: string;
}): Promise<Message> {
  const rows = await db.insert(messages).values(data).returning();
  return rows[0];
}

// ── Seed ──────────────────────────────────────────────────────────────────────

const SEED_RACKETS: InsertRacket[] = [
  // HEVINI
  { brand: 'Hevini', model: 'Solution 1', headSize: 97, stringPattern: '16x19', weightUnstrung: 300, balance: '7 pts HL', stiffnessRa: 68, beamWidth: '21mm', recTensionMin: 48, recTensionMax: 55 },

  // WILSON
  { brand: 'Wilson', model: 'Blade 98 16x19 v9', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '8 pts HL', stiffnessRa: 62, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Blade 98 18x20 v9', headSize: 98, stringPattern: '18x20', weightUnstrung: 305, balance: '8 pts HL', stiffnessRa: 62, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Blade 100 v9', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '6 pts HL', stiffnessRa: 62, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Blade 104 v9', headSize: 104, stringPattern: '16x19', weightUnstrung: 290, balance: '4 pts HL', stiffnessRa: 58, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Clash 100 v2', headSize: 100, stringPattern: '16x19', weightUnstrung: 295, balance: '4 pts HL', stiffnessRa: 55, beamWidth: '24mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Clash 98 v2', headSize: 98, stringPattern: '18x20', weightUnstrung: 310, balance: '6 pts HL', stiffnessRa: 55, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Pro Staff 97 v14', headSize: 97, stringPattern: '16x19', weightUnstrung: 315, balance: '9 pts HL', stiffnessRa: 66, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Pro Staff 97L v14', headSize: 97, stringPattern: '16x19', weightUnstrung: 290, balance: '8 pts HL', stiffnessRa: 66, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Ultra 100 v4', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '4 pts HL', stiffnessRa: 69, beamWidth: '23mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Shift 99 v1', headSize: 99, stringPattern: '16x19', weightUnstrung: 315, balance: '7 pts HL', stiffnessRa: 65, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Wilson', model: 'Burn 100 v5', headSize: 100, stringPattern: '16x19', weightUnstrung: 295, balance: '5 pts HL', stiffnessRa: 65, beamWidth: '23mm', recTensionMin: 50, recTensionMax: 60 },

  // BABOLAT
  { brand: 'Babolat', model: 'Pure Aero 98 2023', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 71, beamWidth: '23mm', recTensionMin: 55, recTensionMax: 62 },
  { brand: 'Babolat', model: 'Pure Aero 100 2023', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '4 pts HL', stiffnessRa: 71, beamWidth: '23-26mm', recTensionMin: 55, recTensionMax: 62 },
  { brand: 'Babolat', model: 'Pure Aero Rafa 2023', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '4 pts HL', stiffnessRa: 72, beamWidth: '23-26mm', recTensionMin: 55, recTensionMax: 62 },
  { brand: 'Babolat', model: 'Pure Aero Plus 2023', headSize: 100, stringPattern: '16x19', weightUnstrung: 295, balance: '4 pts HL', stiffnessRa: 71, beamWidth: '23-26mm', recTensionMin: 55, recTensionMax: 62 },
  { brand: 'Babolat', model: 'Pure Drive 2021', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '4 pts HL', stiffnessRa: 72, beamWidth: '23-26mm', recTensionMin: 55, recTensionMax: 62 },
  { brand: 'Babolat', model: 'Pure Drive 98 2025', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 72, beamWidth: '23mm', recTensionMin: 55, recTensionMax: 62 },
  { brand: 'Babolat', model: 'Pure Drive Tour 2021', headSize: 97, stringPattern: '16x19', weightUnstrung: 315, balance: '8 pts HL', stiffnessRa: 72, beamWidth: '23mm', recTensionMin: 55, recTensionMax: 62 },
  { brand: 'Babolat', model: 'Pure Strike 97 v4', headSize: 97, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 69, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Babolat', model: 'Pure Strike 100 v4', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '4 pts HL', stiffnessRa: 69, beamWidth: '21-24mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Babolat', model: 'Pure Strike VS 2022', headSize: 98, stringPattern: '18x20', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 70, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Babolat', model: 'Pure Strike Team v4', headSize: 100, stringPattern: '16x19', weightUnstrung: 285, balance: '4 pts HL', stiffnessRa: 67, beamWidth: '21-24mm', recTensionMin: 50, recTensionMax: 59 },

  // HEAD
  { brand: 'Head', model: 'Speed MP 2024', headSize: 100, stringPattern: '16x19', weightUnstrung: 295, balance: '4 pts HL', stiffnessRa: 65, beamWidth: '23mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Head', model: 'Speed Pro 2024', headSize: 100, stringPattern: '18x20', weightUnstrung: 310, balance: '4 pts HL', stiffnessRa: 68, beamWidth: '22.5mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Speed Pro Legend 2024', headSize: 100, stringPattern: '18x20', weightUnstrung: 320, balance: '5 pts HL', stiffnessRa: 67, beamWidth: '22.5mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Speed MP L 2024', headSize: 102, stringPattern: '16x19', weightUnstrung: 270, balance: '4 pts HL', stiffnessRa: 63, beamWidth: '23.5mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Head', model: 'Radical MP 2023', headSize: 98, stringPattern: '16x19', weightUnstrung: 295, balance: '6 pts HL', stiffnessRa: 65, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Head', model: 'Radical Pro 2023', headSize: 98, stringPattern: '18x20', weightUnstrung: 310, balance: '7 pts HL', stiffnessRa: 67, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Head', model: 'Gravity MP 2023', headSize: 100, stringPattern: '16x20', weightUnstrung: 295, balance: '4 pts HL', stiffnessRa: 56, beamWidth: '22.5mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Gravity Pro 2024', headSize: 100, stringPattern: '18x20', weightUnstrung: 310, balance: '4 pts HL', stiffnessRa: 58, beamWidth: '22mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Gravity Pro 2025', headSize: 100, stringPattern: '18x20', weightUnstrung: 315, balance: '5 pts HL', stiffnessRa: 58, beamWidth: '22mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Extreme MP 2022', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '4 pts HL', stiffnessRa: 68, beamWidth: '25mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Extreme MP L 2024', headSize: 100, stringPattern: '16x19', weightUnstrung: 285, balance: '4 pts HL', stiffnessRa: 65, beamWidth: '25mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Boom MP 2024', headSize: 100, stringPattern: '16x19', weightUnstrung: 295, balance: '4 pts HL', stiffnessRa: 62, beamWidth: '24mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Boom Pro 2024', headSize: 98, stringPattern: '16x19', weightUnstrung: 310, balance: '5 pts HL', stiffnessRa: 63, beamWidth: '23mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Prestige MP 2023', headSize: 98, stringPattern: '18x20', weightUnstrung: 310, balance: '8 pts HL', stiffnessRa: 65, beamWidth: '21mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Head', model: 'Prestige Pro 2023', headSize: 95, stringPattern: '18x20', weightUnstrung: 315, balance: '8 pts HL', stiffnessRa: 68, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 59 },
  { brand: 'Head', model: 'Prestige Tour 2023', headSize: 99, stringPattern: '18x20', weightUnstrung: 335, balance: '9 pts HL', stiffnessRa: 68, beamWidth: '21mm', recTensionMin: 52, recTensionMax: 62 },

  // YONEX
  { brand: 'Yonex', model: 'EZONE 98 2022', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '7 pts HL', stiffnessRa: 66, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'EZONE 98 2025', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '7 pts HL', stiffnessRa: 66, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'EZONE 98 Tour 2022', headSize: 98, stringPattern: '16x19', weightUnstrung: 315, balance: '8 pts HL', stiffnessRa: 68, beamWidth: '21.5mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Yonex', model: 'EZONE 100 2022', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '6 pts HL', stiffnessRa: 65, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'VCORE 98 2023', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '7 pts HL', stiffnessRa: 72, beamWidth: '22.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'VCORE 98 Tour 2023', headSize: 98, stringPattern: '16x19', weightUnstrung: 315, balance: '8 pts HL', stiffnessRa: 73, beamWidth: '22.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'VCORE 100 2023', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '6 pts HL', stiffnessRa: 72, beamWidth: '22.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'Percept 97 2023', headSize: 97, stringPattern: '16x19', weightUnstrung: 305, balance: '7 pts HL', stiffnessRa: 64, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'Percept 97H 2023', headSize: 97, stringPattern: '18x20', weightUnstrung: 315, balance: '8 pts HL', stiffnessRa: 64, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'Percept 100 2023', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 63, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'VCORE Pro 97 2020', headSize: 97, stringPattern: '16x19', weightUnstrung: 310, balance: '8 pts HL', stiffnessRa: 67, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Yonex', model: 'VCORE Pro 97D', headSize: 97, stringPattern: '16x19', weightUnstrung: 310, balance: '8 pts HL', stiffnessRa: 67, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },

  // DUNLOP
  { brand: 'Dunlop', model: 'CX 200 2021', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '7 pts HL', stiffnessRa: 65, beamWidth: '20.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Dunlop', model: 'CX 200 Tour 18x20', headSize: 98, stringPattern: '18x20', weightUnstrung: 316, balance: '8 pts HL', stiffnessRa: 65, beamWidth: '20.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Dunlop', model: 'CX 200 LS', headSize: 98, stringPattern: '16x19', weightUnstrung: 290, balance: '5 pts HL', stiffnessRa: 63, beamWidth: '20.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Dunlop', model: 'CX 400 Tour 2021', headSize: 100, stringPattern: '16x19', weightUnstrung: 290, balance: '5 pts HL', stiffnessRa: 63, beamWidth: '23mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Dunlop', model: 'FX 500 2022', headSize: 100, stringPattern: '16x19', weightUnstrung: 295, balance: '4 pts HL', stiffnessRa: 65, beamWidth: '23mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Dunlop', model: 'FX 500 Tour 2022', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 65, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Dunlop', model: 'SX 300 2022', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 71, beamWidth: '25mm', recTensionMin: 50, recTensionMax: 60 },

  // TECNIFIBRE
  { brand: 'Tecnifibre', model: 'TF40 305 16x19', headSize: 100, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 65, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Tecnifibre', model: 'TF40 315 18x20', headSize: 100, stringPattern: '18x20', weightUnstrung: 315, balance: '7 pts HL', stiffnessRa: 65, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Tecnifibre', model: 'T-Fight 300 Isoflex', headSize: 98, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 68, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Tecnifibre', model: 'T-Fight 315 Isoflex', headSize: 98, stringPattern: '16x19', weightUnstrung: 315, balance: '7 pts HL', stiffnessRa: 68, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Tecnifibre', model: 'T-Fight 305 RS', headSize: 100, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 70, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Tecnifibre', model: 'TF-X1 300', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '4 pts HL', stiffnessRa: 63, beamWidth: '24mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Tecnifibre', model: 'Tempo 298 Iga', headSize: 98, stringPattern: '16x18', weightUnstrung: 298, balance: '6 pts HL', stiffnessRa: 65, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Tecnifibre', model: 'T-Fight Iso 305 2024', headSize: 100, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 68, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },

  // PRINCE
  { brand: 'Prince', model: 'Phantom 100X 18x20', headSize: 100, stringPattern: '18x20', weightUnstrung: 310, balance: '6 pts HL', stiffnessRa: 68, beamWidth: '21mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Prince', model: 'ATS Textreme Tour 98', headSize: 98, stringPattern: '16x18', weightUnstrung: 305, balance: '7 pts HL', stiffnessRa: 66, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Prince', model: 'ATS Textreme Tour 100P', headSize: 100, stringPattern: '16x18', weightUnstrung: 310, balance: '6 pts HL', stiffnessRa: 66, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Prince', model: 'Ripstick 100 280', headSize: 100, stringPattern: '16x19', weightUnstrung: 280, balance: '4 pts HL', stiffnessRa: 58, beamWidth: '24mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Prince', model: 'Warrior 100 310', headSize: 100, stringPattern: '16x19', weightUnstrung: 310, balance: '6 pts HL', stiffnessRa: 68, beamWidth: '24mm', recTensionMin: 50, recTensionMax: 60 },

  // SOLINCO
  { brand: 'Solinco', model: 'Whiteout 305', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 66, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Solinco', model: 'Whiteout 305 XTD 18x20', headSize: 98, stringPattern: '18x20', weightUnstrung: 305, balance: '7 pts HL', stiffnessRa: 66, beamWidth: '21mm', recTensionMin: 52, recTensionMax: 62 },
  { brand: 'Solinco', model: 'Blackout 300', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 65, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Solinco', model: 'Whiteout 290', headSize: 98, stringPattern: '16x19', weightUnstrung: 290, balance: '5 pts HL', stiffnessRa: 64, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },

  // VÖLKL
  { brand: 'Völkl', model: 'C10 Pro 2023', headSize: 98, stringPattern: '18x20', weightUnstrung: 304, balance: '8 pts HL', stiffnessRa: 65, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Völkl', model: 'V-Cell 8 315', headSize: 100, stringPattern: '16x19', weightUnstrung: 315, balance: '7 pts HL', stiffnessRa: 68, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Völkl', model: 'V-Cell 10 300', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 66, beamWidth: '23mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Völkl', model: 'V-Feel 8 300', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 62, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },

  // PROKENNEX
  { brand: 'ProKennex', model: 'Ki Q+ Tour Pro 315', headSize: 98, stringPattern: '16x18', weightUnstrung: 315, balance: '7 pts HL', stiffnessRa: 67, beamWidth: '21mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'ProKennex', model: 'Black Ace 300', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 66, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'ProKennex', model: 'Ki Q+ 5 Pro 310', headSize: 98, stringPattern: '16x19', weightUnstrung: 310, balance: '6 pts HL', stiffnessRa: 67, beamWidth: '21.5mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'ProKennex', model: 'Ki 15 280', headSize: 105, stringPattern: '16x19', weightUnstrung: 280, balance: '3 pts HL', stiffnessRa: 62, beamWidth: '25mm', recTensionMin: 50, recTensionMax: 60 },

  // DIADEM
  { brand: 'Diadem', model: 'Elevate 98 v3', headSize: 98, stringPattern: '16x19', weightUnstrung: 305, balance: '6 pts HL', stiffnessRa: 68, beamWidth: '22mm', recTensionMin: 50, recTensionMax: 60 },
  { brand: 'Diadem', model: 'Nova FS 100', headSize: 100, stringPattern: '16x19', weightUnstrung: 300, balance: '5 pts HL', stiffnessRa: 66, beamWidth: '23mm', recTensionMin: 50, recTensionMax: 60 },
];

export async function seedDatabase(): Promise<void> {
  try {
    const existing = await db.select().from(rackets).limit(1);
    if (existing.length > 0) return;

    await db.insert(rackets).values(SEED_RACKETS);
    console.log(`Seeded ${SEED_RACKETS.length} rackets.`);
  } catch (err) {
    console.error('Seed error:', err);
  }
}
