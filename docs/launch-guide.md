# 10IS v2 launch guide — 1 December 2026

Written for a solo founder doing this for the first time. Follow it top to bottom. Every step says **where** to click, **what** to copy, and **how you know it worked**. Nothing here needs code.

> **The one rule:** production (`ai-racket-tech` on Railway, the live 10is.app) is the only place real customers and real data live. Every step that touches it is marked **⚠ PRODUCTION**. Do those slowly, in order, and never skip the backup.

**Words you'll see**

| Word | Plain meaning |
|---|---|
| Environment variable ("variable", "key") | A setting the server reads when it starts, like a password it needs to talk to Stripe. You paste them into Railway → service → **Variables**. Changing one restarts the site (about a minute). |
| Test mode / live mode | Stripe has a practice world (fake cards, no money) and a real one. Keys start `sk_test_…` or `sk_live_…`. |
| Webhook | Stripe calling 10IS back to say "this person paid", so their account upgrades. |
| Preview | https://10is-b2b-v2-preview.up.railway.app — a full copy of v2 with fake demo data. Break anything you like there. |
| Merge | Accepting a pull request on GitHub. Merging into `main` is what puts v2 live. |

---

## Timeline at a glance

| Day | What | Time |
|---|---|---|
| **Fri 27 Nov** | Create/collect accounts and keys (part A) | 2 h |
| **Sat 28 Nov** | Test payments end-to-end on the preview (part B) | 1 h |
| **Sun 29 Nov** | Decide prices, merge PR #3, read the preview one last time (part C) | 1 h |
| **Mon 30 Nov** | ⚠ Backup, safety check, production settings (part D) | 1 h |
| **Tue 1 Dec** | ⚠ Go live in the morning, smoke test, announce (part E) | 2 h |

Launch in the **morning** your time on a weekday, so you have the whole day to watch it.

---

## Part A — Accounts and keys (Fri 27 Nov)

Keep a private note (Apple Notes locked note or a password manager) and paste each key there as you get it. **Never** paste keys into chat, email, GitHub, or a screenshot.

### A1. Session secret (2 minutes) — required

This scrambles login cookies. v2 refuses to start without it, so production would go down.

1. Open the **Terminal** app on your Mac.
2. Type `openssl rand -hex 32` and press Return.
3. Copy the 64-character line it prints into your note as `SESSION_SECRET`.

Side effect: when you set it on production (part D), everyone gets logged out once. That's fine and fixes a real security hole (v1 currently uses a default, guessable secret).

### A2. Stripe (30 minutes) — required, takes money

1. Go to https://dashboard.stripe.com and sign in (or create the account with your business email).
2. **Activate payments**: Settings → Business → *Activate account*. You'll need your legal business name (Hevini Sporting), EIN or SSN, address, bank account for payouts, and a support email/phone. Stripe may take 1–2 days to approve, so do this today.
3. **Branding**: Settings → Branding → upload the 10IS icon, set the brand colour to `#C8102E`. This is what customers see on the checkout page.
4. **Statement descriptor**: Settings → Business → Public details → set it to `10IS.APP` so card statements don't look like fraud.
5. **Customer portal**: Settings → Billing → Customer portal → *Activate*. Allow "cancel subscription" and "update payment method". (10IS links people here from their Account page.)
6. **Test keys**: top right, switch **Test mode** on → Developers → API keys → copy the **Secret key** (`sk_test_…`) into your note.
7. Leave live keys for part D.

You do **not** need to create products or prices in Stripe. 10IS sends the price with every checkout.

### A3. OpenAI (10 minutes) — required, powers recommendations

Production already has a key. Check it still works and protect yourself from a surprise bill:

1. https://platform.openai.com → Settings → **Billing** → make sure there's credit or a card.
2. Settings → **Limits** → set a monthly budget (start with **$50**) and an email alert at 50%.
3. If you ever need a new key: API keys → *Create new secret key* → name it `10is-production`.

Rough cost: a few cents per recommendation. 1,000 recommendations ≈ $10–30.

### A4. Google Maps (20 minutes) — required, powers stringer search

Production already has a key, but billing must be on or search returns nothing.

1. https://console.cloud.google.com → pick the project the key belongs to (APIs & Services → Credentials shows the key).
2. **Billing** → link a billing account (card). Google gives a free monthly credit; a small app stays inside it.
3. APIs & Services → Library → enable **Places API (New)**.
4. Credentials → click the key → **API restrictions** → *Restrict key* → tick **Places API (New)** (and "Places API" if listed). Save. This stops anyone who finds the key using it for other paid Google services.
5. Billing → **Budgets & alerts** → budget **$25/month** with email alerts.

### A5. Resend email (30 minutes) — strongly recommended

Sends restring reminders and "your racket is ready" emails. Without it the app works, but those emails silently don't go out.

1. https://resend.com → sign up with your business email.
2. **Domains** → *Add domain* → `10is.app`.
3. Resend shows 3–4 DNS records (TXT and MX/CNAME). Log into wherever you bought **10is.app** (Namecheap, GoDaddy, Cloudflare, Google Domains/Squarespace…) → DNS settings → add each record exactly as shown. Don't delete existing records (Railway needs the ones pointing at the site).
4. Back in Resend, click **Verify**. It can take a few minutes up to a few hours.
5. **API Keys** → *Create* → permission "Sending access" → copy (`re_…`) into your note as `RESEND_API_KEY`.

### A6. Inboxes customers will write to (15 minutes)

The site tells people to email these. Make sure each one actually reaches you:

- `contact@hevini.com` — support (already yours).
- `partners@10is.app` — brands and retailers asking to be verified.
- `reminders@10is.app` — the "from" address on reminder emails. Replies go here.

Easiest: at your domain registrar or with ImprovMX (free), forward `partners@` and `reminders@` → your main inbox.

---

## Part B — Test payments on the preview (Sat 28 Nov)

You're going to pay with a fake card on the copy of the site. If this works, live will work.

1. Railway → project **10is.App** → environment **v2-preview** → service **10is-b2b** → **Variables** → *New variable*:
   - `STRIPE_SECRET_KEY` = your `sk_test_…` key
2. Stripe (test mode) → Developers → **Webhooks** → *Add endpoint*:
   - URL: `https://10is-b2b-v2-preview.up.railway.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Save → click **Reveal signing secret** (`whsec_…`) → add it in Railway as `STRIPE_WEBHOOK_SECRET`.
3. Wait a minute for the preview to restart. Then on the preview:
   - Sign up with any `you+test1@example.com` email.
   - Pricing → **Pro monthly** → pay with card `4242 4242 4242 4242`, any future date, any CVC, any ZIP.
   - You should land back on 10IS and see **Pro** on your Account page within a few seconds. ✅
   - Account → *Manage billing* → cancel → after the period it drops to Free (Stripe test clocks aside, just check the portal opens).
   - Try the card `4000 0000 0000 9995` — it should be declined nicely.
4. Repeat once for **Shop Pro** (open the stringer dashboard → upgrade) and once for **Insights** (brand dashboard → upgrade).
5. Stripe → Payments (test mode) shows each one. ✅

If an upgrade doesn't show: Stripe → Webhooks → click the endpoint → look for red failed events. The usual cause is a mistyped `whsec_` secret.

---

## Part C — Decide, merge, rehearse (Sun 29 Nov)

### C1. Prices
Decide whether to keep the shipped prices or adjust (see the decision in the tracker). Changing them is a 10-minute code change — ask Claude before Monday.

### C2. Merge PR #3 into `rebuild/10is-v2`
1. Open https://github.com/teamhevini/ai-racket-tech/pull/3.
2. Wait for the green ✔ next to the checks.
3. *Merge pull request* → *Confirm*. This does **not** touch the live site; it only updates the v2 branch that PR #2 will carry to `main`.

### C3. Final read-through
On the preview, click through as a player on your phone: Home → setup → recommendation → book a stringer → My bag. Then sign in as the demo stringer (`stringer@example.com`) and the demo brand (`brand@example.com`); both use the password `demo-tennis-2026`. These accounts exist only on the preview. Write anything odd in the tracker.

---

## Part D — ⚠ PRODUCTION settings (Mon 30 Nov)

### D1. ⚠ Backup (5 minutes) — never skip
1. Railway → project **10is.App** → environment **production** → the **Postgres** database used by `ai-racket-tech` → **Backups** tab → *Create backup*. Wait until it says completed.
2. If you don't see a Backups tab, tell Claude before going further.

### D2. ⚠ Safety check (5 minutes)
This reads production and tells you whether the v2 deploy would delete any data. It changes nothing.

1. Install the Railway command line once: in Terminal, `brew install railway` (or see railway.com/cli), then `railway login`.
2. In Terminal, go to the project folder and run:
   `railway run --service ai-racket-tech --environment production npm run predeploy:check`
3. ✅ Good: it ends with **"Nothing will be deleted."**
4. ❌ Stop: it shows **"!! WILL BE DELETED"**. Do not merge. Send Claude the list (it contains table names only, no customer data).

### D3. ⚠ Production variables
Railway → production → **ai-racket-tech** → **Variables**. Add or check each one. (Adding a variable restarts the current v1 site; that's harmless.)

| Variable | Value | Already there? |
|---|---|---|
| `SESSION_SECRET` | the 64-character line from A1 | **No — add it** |
| `APP_URL` | `https://10is.app` | **No — add it** |
| `RESEND_API_KEY` | `re_…` from A5 | No — add it |
| `OPENAI_API_KEY` | existing | Yes |
| `GOOGLE_MAPS_API_KEY` | existing | Yes |
| `STRIPE_SECRET_KEY` | **live** key, see D4 | Yes (check it's live) |
| `STRIPE_WEBHOOK_SECRET` | **live** webhook secret, see D4 | Yes (re-check events) |
| `DATABASE_URL`, `NODE_ENV`, `PORT` | leave alone | Yes |

Do **not** add `SEED_DEMO` or `SEED_DEMO_RESET` to production. Ever. They create fake demo accounts.

Optional, later: `CRON_SECRET` (only if you use an outside scheduler; reminders already run inside the app), `AFFILIATE_POSTBACK_SECRET` (when a retailer agrees to report sales).

### D4. ⚠ Stripe live
1. Stripe → switch **Test mode off**. (Only possible once your account is activated, A2.)
2. Developers → API keys → reveal the live **Secret key** (`sk_live_…`) → paste into production `STRIPE_SECRET_KEY`.
3. Developers → Webhooks (live) → if an endpoint for `https://10is.app/api/webhooks/stripe` exists, click it → *Update details* → make sure all four events from part B are ticked. If none exists, add it with those events.
4. Copy its signing secret → production `STRIPE_WEBHOOK_SECRET`.

---

## Part E — ⚠ Go live (Tue 1 Dec, morning)

1. Open **PR #2** (`rebuild/10is-v2` → `main`) on GitHub. Check it's green.
2. *Merge pull request*. Railway starts deploying `main` automatically. Railway → production → ai-racket-tech → **Deployments** shows progress (3–6 minutes). The first step creates the new tables.
3. When it says **Active**, open https://10is.app on your phone and laptop.

**Smoke test (15 minutes):**
- [ ] Home page loads, the 3D racket shows.
- [ ] Log in with your own account (you'll need to log in again — expected).
- [ ] Get a string setup. A recommendation appears.
- [ ] Stringer search finds stringers near you.
- [ ] Your existing bag and history are still there.
- [ ] Go to **/admin** → *Launch setup* → every required line is a green tick and Stripe says **live mode**.
- [ ] Buy **Pro monthly with your own real card**. Account shows Pro. Then refund yourself in Stripe → Payments → *Refund*.
- [ ] Add to Home Screen on your phone works.

**If something is badly broken:** Railway → Deployments → the previous (v1) deployment → ⋯ → **Redeploy**. The site is back to v1 in a few minutes. The new tables stay but v1 ignores them. Then message Claude with what you saw.

4. Announce: post the stories, pin a post, email your list, message the stringers you know.

---

## First week after launch

- **Every morning (10 min):** /admin (new members, brands waiting to verify), Stripe → Payments, Railway → Observability → any red errors.
- **Verify brands:** when a brand emails partners@10is.app from an address on its own website domain, open /admin → Brands and retailers → **Verify**. For an already-listed brand (e.g. Luxilon), ask them to sign up first, then *Give to account*.
- **Weekly:** Railway backup, check OpenAI and Google spend, update the tracker.

## Costs to expect (monthly, early days)

| Service | Expected |
|---|---|
| Railway (site + database) | $5–20 |
| OpenAI | $5–30 |
| Google Maps | $0 (inside the free credit) |
| Resend | $0 (free up to 3,000 emails) |
| Stripe | 2.9% + 30¢ per payment, nothing otherwise |
| Domain | ~$15/year |

## Things that are not required for launch but you should know

- **Sales tax:** in the US, digital subscriptions are taxable in some states. Stripe Tax (Settings → Tax) can handle it automatically for 0.5% per transaction. Worth turning on once revenue starts; ask an accountant.
- **Business entity and insurance:** taking payments as Hevini Sporting is fine; make sure the Stripe account is in the company's name, not personal.
- **Legal pages:** Privacy and Terms are updated for v2 (bookings, shops, brands, sponsored placements, affiliate links). They are a solid starting point, not a lawyer's review. Get one when brand money starts flowing.
