import { sql } from "drizzle-orm";
import { db } from "./db";
import { rackets } from "@shared/schema";
import { storage } from "./storage";
import { RACKET_CATALOG } from "./seed-data";
import { ADMIN_EMAIL } from "./auth";
import { log } from "./log";

/**
 * Bring the racket catalog up to date without ever deleting rows.
 * Existing rackets keep their ids (so recommendation history keeps pointing at
 * the right frame); specs are refreshed and new frames are added.
 */
export async function seedCatalog(): Promise<void> {
  await db.execute(sql`UPDATE ${rackets} SET brand = 'Völkl' WHERE brand = 'Volkl'`);
  const existing = await storage.getAllRackets();
  const byKey = new Map(existing.map((r) => [`${r.brand}|${r.model}`, r]));
  let added = 0;
  let updated = 0;
  for (const entry of RACKET_CATALOG) {
    const found = byKey.get(`${entry.brand}|${entry.model}`);
    if (!found) {
      await storage.createRacket(entry);
      added++;
      continue;
    }
    const changed = (Object.keys(entry) as Array<keyof typeof entry>).some(
      (k) => k in found && (found as Record<string, unknown>)[k] !== entry[k],
    );
    if (changed) {
      await storage.updateRacket(found.id, entry);
      updated++;
    }
  }
  if (added || updated) log(`catalog: ${added} added, ${updated} updated`, "seed");
}

export async function seedAdmin(): Promise<void> {
  await storage.ensureAdmin(ADMIN_EMAIL);
}
