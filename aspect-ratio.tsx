# AI Racket Tech — Tennis String Recommendation MVP

An AI-powered personal racket technician that recommends string setups based on your racket, player profile, playstyle, and injury risk. Includes a live AI chat advisor and local stringer search.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set environment variables

Create a `.env` file in the project root (or set these in your host's secrets/env panel):

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
OPENAI_API_KEY=sk-...
GOOGLE_MAPS_API_KEY=AIza...
```

> **Replit users**: Add these in the **Secrets** tab (lock icon in the sidebar). Use the exact key names above.

### 3. Push the database schema
```bash
npm run db:push
```

This creates all tables (rackets, recommendation_runs, feedback, conversations, messages).

### 4. Run the app
```bash
npm run dev
```

App runs on `http://localhost:5000`

---

## Features

| Feature | Free | Pro |
|---------|------|-----|
| Racket database search | ✅ | ✅ |
| AI string recommendation | ✅ | ✅ |
| Confidence badge (High/Medium/Estimated) | ✅ | ✅ |
| Shareable recommendation URL | ✅ | ✅ |
| Find stringers near me | ✅ | ✅ |
| AI chat advisor | ❌ | ✅ |
| Saved recommendation history | ❌ | ✅ |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/onboarding` | 3-step player profile wizard |
| `/recommendation/:runId` | Shareable recommendation result |
| `/rackets` | Searchable racket database |
| `/stringers` | Find local stringers (Google Maps) |
| `/feedback?runId=N` | Rate your recommendation |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rackets/search?q=` | Search racket database |
| GET | `/api/rackets/:id` | Get racket specs |
| POST | `/api/recommend` | Generate AI recommendation |
| GET | `/api/recommendation-runs/:id` | Fetch saved recommendation |
| POST | `/api/feedback` | Submit feedback |
| GET | `/api/stringers/search?query=&lat=&lng=` | Find nearby stringers |
| POST | `/api/conversations` | Start chat session |
| POST | `/api/conversations/:id/messages` | Send chat message (streaming SSE) |

---

## Testing the Pro Chat

For local development, open browser console and run:
```js
localStorage.setItem("pro_user", "true")
```
Then refresh — the chat widget will unlock. Replace with real auth before launch.

---

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Wouter, TanStack Query, shadcn/ui, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI GPT-4o
- **Maps**: Google Places API
