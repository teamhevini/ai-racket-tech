/**
 * Read-only pre-deploy check.
 *
 * Production deploys run `drizzle-kit push --force`, which makes the live database
 * match shared/schema.ts — including DROPPING any table or column that isn't in the
 * code. This script shows exactly what a deploy would add and, more importantly,
 * what it would delete, without changing anything.
 *
 *   railway run --service ai-racket-tech --environment production npm run predeploy:check
 *
 * It opens a READ ONLY transaction and only runs SELECTs.
 */
import "dotenv/config";
import pg from "pg";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "../shared/schema";

const KEEP = new Set(["user_sessions"]); // owned by connect-pg-simple; excluded from push in drizzle.config.ts

/** Every table defined in shared/schema.ts, with its column names. */
export function codeTables(): Map<string, Set<string>> {
  const code = new Map<string, Set<string>>();
  for (const v of Object.values(schema)) {
    if (v && typeof v === "object" && Symbol.for("drizzle:IsDrizzleTable") in (v as object)) {
      const cfg = getTableConfig(v as PgTable);
      code.set(cfg.name, new Set(cfg.columns.map((c) => c.name)));
    }
  }
  return code;
}

/** What `push --force` would do to a live database to make it match the code. */
export function planChanges(live: Map<string, Set<string>>, code: Map<string, Set<string>>) {
  const dropTables: string[] = [];
  const dropColumns: string[] = [];
  for (const [t, cols] of live) {
    if (KEEP.has(t)) continue;
    if (!code.has(t)) {
      dropTables.push(t);
      continue;
    }
    for (const c of cols) if (!code.get(t)!.has(c)) dropColumns.push(`${t}.${c}`);
  }
  const addTables = [...code.keys()].filter((t) => !live.has(t));
  const addColumns: string[] = [];
  for (const [t, cols] of code) {
    if (!live.has(t)) continue;
    for (const c of cols) if (!live.get(t)!.has(c)) addColumns.push(`${t}.${c}`);
  }
  return { dropTables, dropColumns, addTables, addColumns };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run this through `railway run` so it uses the production database.");
    process.exit(2);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const { rows } = await client.query<{ table_name: string; column_name: string }>(
      `SELECT c.table_name, c.column_name
         FROM information_schema.columns c
         JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'`,
    );
    const counts = await client.query<{ relname: string; n: string }>(
      `SELECT relname, n_live_tup::text AS n FROM pg_stat_user_tables WHERE schemaname = 'public'`,
    );
    await client.query("ROLLBACK");

    const live = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!live.has(r.table_name)) live.set(r.table_name, new Set());
      live.get(r.table_name)!.add(r.column_name);
    }
    const rowsIn = new Map(counts.rows.map((r) => [r.relname, Number(r.n)]));

    const code = codeTables();
    const { dropTables: dropNames, dropColumns, addTables, addColumns } = planChanges(live, code);
    const dropTables = dropNames.map((t) => `${t} (${rowsIn.get(t) ?? "?"} rows)`);

    console.log("\n10IS pre-deploy check (read only)\n");
    console.log(`Live tables: ${live.size}   Tables in code: ${code.size}`);
    console.log(`\nWill be ADDED (safe):\n  tables:  ${addTables.join(", ") || "none"}\n  columns: ${addColumns.join(", ") || "none"}`);
    if (dropTables.length || dropColumns.length) {
      console.log("\n!! WILL BE DELETED by the deploy (data loss):");
      if (dropTables.length) console.log("  tables:  " + dropTables.join(", "));
      if (dropColumns.length) console.log("  columns: " + dropColumns.join(", "));
      console.log("\nDo NOT deploy until this is resolved. Take a backup first and ask for help.\n");
      process.exit(1);
    }
    console.log("\nNothing will be deleted. Safe to deploy (take a backup first anyway).\n");
  } finally {
    await client.end();
  }
}

// Run only when executed directly (tests import the functions above).
if (process.argv[1]?.endsWith("predeploy-check.ts")) {
  main().catch((err) => {
    console.error("Check failed:", err.message);
    process.exit(2);
  });
}
