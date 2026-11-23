import { defineConfig } from "drizzle-kit";

// `npm run db:generate` needs no database. `npm run db:push` (used on deploy) needs DATABASE_URL.
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  // user_sessions belongs to connect-pg-simple, not our schema. Without this filter,
  // `db:push --force` on every deploy dropped it and logged everyone out (v1 bug too).
  tablesFilter: ["!user_sessions"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/unused",
  },
});
