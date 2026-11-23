# 10IS — your racket, dialled in

10IS is a tennis app by Hevini Sporting. Players get an AI string setup tuned to their racket and game, keep a bag of rackets with the full restring history of each, get reminded when strings are past their best, and save the stringers they trust.

## Stack

- **Client:** React 18, Vite, Tailwind, TanStack Query, wouter, framer-motion, Radix + vaul sheets, sonner toasts
- **Server:** Express, Drizzle ORM, Postgres (PGlite locally), express-session (Postgres-backed in production)
- **Integrations:** OpenAI (recommendations + Club chat), Stripe (Pro one-time, Club monthly), Google Places (stringer search), Resend (optional reminder emails)

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5000. With no `DATABASE_URL`, the app runs on an embedded PGlite database in `.data/pglite` — no Postgres needed. Without API keys, recommendations fall back to a safe baseline setup, and stringer search and payments explain that they're not configured.

Copy `.env.example` to `.env` to add keys.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + Vite dev server on port 5000 |
| `npm test` | API and reminder-logic tests (PGlite in memory) |
| `npm run check` | TypeScript across client, server and shared |
| `npm run build` | Production client bundle + server bundle in `dist/` |
| `npm run db:generate` | Regenerate SQL migrations from `shared/schema.ts` (used by PGlite) |
| `npm run db:push` | Sync the schema to `DATABASE_URL` (run on deploy) |

## Layout

```
client/src/
  pages/        one file per route
  features/     racket, restring and stringer forms and cards
  components/   layout, design-system primitives (ui/), freshness ring
  hooks/ lib/   data hooks, API client, formatting
server/
  routes/       account, bag (rackets + history), stringers, recommend, billing, admin, chat
  auth.ts       sessions, entitlements, rate limiting
  reminder-mailer.ts  due-reminder emails
shared/
  schema.ts     database tables and input validation
  reminders.ts  restring interval maths (used by both client and server)
  tiers.ts      plan limits and entitlements
tests/          vitest + supertest
```

## Plans

| | Free | Pro ($4.99 once) | Club ($1.99/mo) |
| --- | --- | --- | --- |
| Rackets in bag | 3 | Unlimited | Unlimited |
| Restring history per racket | Latest 3 | Full | Full |
| Stringer search results | Top 3 | All | All |
| Restring reminders | ✓ | ✓ | ✓ |
| AI technician chat | | | ✓ |

## Reminders

Each racket's interval is worked out from hours played per week and the string type (polyester ≈ 20 playing hours, softer strings ≈ 40), or set by the player. Reminders show in the app, export to any calendar as `.ics`, and are emailed when `RESEND_API_KEY` is set. The production server checks every 6 hours; an external cron can call `POST /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`.
