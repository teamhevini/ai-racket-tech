import { defineConfig } from "drizzle-kit";

// `npm run db:generate` needs no database. `npm run db:push` (used on deploy) needs DATABASE_URL.
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/unused",
  },
});
