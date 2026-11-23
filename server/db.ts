import path from "path";
import fs from "fs";
import pg from "pg";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

/**
 * Production (and anyone with DATABASE_URL set) uses real Postgres.
 * Local development and tests fall back to PGlite — Postgres compiled to WASM —
 * so the app runs with zero setup. PGLITE_DIR=memory gives a throwaway database.
 */

export type Db = NodePgDatabase<typeof schema>;

export let db: Db;
export let pool: pg.Pool | null = null;
export const usingPglite = !process.env.DATABASE_URL;

let ready: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    if (!usingPglite) {
      pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      db = drizzlePg(pool, { schema });
      return;
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL must be set in production.");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: drizzleLite } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dir = process.env.PGLITE_DIR ?? path.resolve(process.cwd(), ".data/pglite");
    if (dir !== "memory") fs.mkdirSync(dir, { recursive: true });
    const client = dir === "memory" ? new PGlite() : new PGlite(dir);
    const liteDb = drizzleLite(client, { schema });
    await migrate(liteDb, { migrationsFolder: path.resolve(process.cwd(), "migrations") });
    // The PGlite and node-postgres drivers expose the same query builder API.
    db = liteDb as unknown as Db;
  })();
  return ready;
}
