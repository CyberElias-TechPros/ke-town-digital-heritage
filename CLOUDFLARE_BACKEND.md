# Cloudflare Backend

The KE Town Digital Heritage API runs as a **single Cloudflare Worker** that serves
both the built SPA and the JSON API from one origin. There is no Express server,
no MySQL, and no WebSocket server to host — everything runs on Cloudflare's edge
runtime.

```
                 ┌──────────────────────────────────────────┐
   Browser  ───▶ │  ke-town-api  (Cloudflare Worker)         │
                 │                                          │
                 │   /            → Workers Assets (dist/)  │
                 │   /api/*       → Hono router             │
                 │   /api/realtime→ Durable Object (WS)     │
                 └───────┬──────────┬─────────┬─────────────┘
                         │          │         │
                       D1 (KE_DB)  R2 (MEDIA) KV (CACHE)
                        61 tables  uploads    rate limits,
                        SQLite     media      presence, cache
```

One origin means **no CORS configuration anywhere** — the browser talks to the
same host for pages, API calls and the realtime socket.

---

## 1. Local development

```bash
# 1. Install (once)
npm install              # frontend
cd worker && npm install # backend

# 2. Local secrets — copy the example and edit
cd worker && cp .dev.vars.example .dev.vars

# 3. Create the schema (111 statements) then seed demo data
npx wrangler d1 migrations apply KE_DB --local
node scripts/seed.mjs --local

# 4. Run the API (serves dist/ + /api on one port)
npx wrangler dev --port 8787 --ip 0.0.0.0

# 5. In another shell, run the frontend with the dev proxy
cd .. && npm run dev     # http://localhost:8080, proxies /api → :8787
```

`vite.config.ts` proxies `/api` (including WebSocket upgrades) to
`http://127.0.0.1:${WORKER_PORT}`. The browser only ever sees relative URLs, so
dev and production use identical client code.

> **Build the frontend before starting `wrangler dev`** — the Worker's assets
> binding points at `../dist`. `npm run build` writes it.

### Seeded accounts

All seeded passwords are `KEtown@2026` (override with `SEED_PASSWORD`).

| Email | ID | Role | Notes |
| --- | --- | --- | --- |
| `admin@ketown.com.ng` | `usr_admin` | `admin` | Full console access |
| `amina@ketown.com.ng` | `usr_amina` | `content_manager` | Can publish news/gallery |
| `tari@ketown.com.ng` | `usr_tari` | `seller` | Shop `shp_1` "Dokubo Loom" |
| `boma@ketown.com.ng` | `usr_boma` | `member` | Also a registered mentor |

Seed data: 4 users, 4 products (`prd_1…prd_4`), 5 gallery items (`gal_1…gal_5`),
news, calendar events, festivals, elder stories, oral histories, phrases, houses,
environment reports, projects, jobs, mentorships, volunteer slots, polls,
petitions and campaigns — **113 insert statements** in total.

---

## 2. Deploying to Cloudflare

```bash
# One-time: create the real resources, then paste the returned IDs into wrangler.toml
npx wrangler d1 create KE_DB                    # → database_id
npx wrangler kv namespace create CACHE          # → id
npx wrangler r2 bucket create ke-town-media
npx wrangler secret put JWT_SECRET              # long random string
npx wrangler secret put ADMIN_EMAIL

# Push the schema to the remote database
npx wrangler d1 migrations apply KE_DB --remote

# Deploy
npm run build          # regenerate ../dist
cd worker && npx wrangler deploy
```

Required secrets / vars:

| Name | Purpose |
| --- | --- |
| `JWT_SECRET` | HMAC key for session tokens. **Required in production.** |
| `JWT_TTL_SECONDS` | Token lifetime, default `604800` (7 days) |
| `EXPOSE_RESET_TOKEN` | Must stay `0` in production |
| `UPLOAD_MAX_BYTES` | Upload ceiling, default `10485760` (10 MB) |
| `RATE_LIMIT_DISABLED` | Leave unset in production |
| `RATE_LIMIT_MULTIPLIER` | Optional; scales every limit up |

`wrangler.toml` ships with `REPLACE_WITH_REAL_D1_ID` / `REPLACE_WITH_REAL_KV_ID`
placeholders. Local runs work because Miniflare simulates both; remote deploys
will not until you substitute the real IDs.

---

## 3. What is in the Worker

```
worker/
├── migrations/
│   ├── 0001_schema.sql        61 tables + indexes
│   └── 0002_read_receipts.sql messages.read_at
├── scripts/seed.mjs           demo data loader (--local | --remote)
├── src/
│   ├── index.ts               entry: fetch, scheduled, assets passthrough
│   ├── types.ts               Env + AppEnv
│   ├── realtime.ts            RealtimeHub Durable Object
│   ├── middleware.ts          auth, RBAC, KV rate limiting, audit
│   ├── lib/
│   │   ├── crypto.ts          PBKDF2 password hashing (WebCrypto)
│   │   ├── jwt.ts             HS256 sign/verify
│   │   ├── db.ts              D1 helpers: all/first/run/count/transaction
│   │   ├── http.ts            json, errors, pagination, param parsing
│   │   ├── users.ts           hydrateUser, blocks, permissions
│   │   └── notify.ts          notifications + realtime fan-out
│   └── routes/                296 endpoints across 11 modules
│       ├── heritage.ts   39   news, gallery, calendar, festivals,
│       │                      elder stories, oral history, phrases, houses
│       ├── marketplace.ts 38  listings, cart, orders, shops, reviews, payments
│       ├── social.ts      36  posts, reactions, comments, follows, saved, feed
│       ├── civic.ts       30  polls, petitions, campaigns, reports, donations
│       ├── groups.ts      29  groups, membership, join requests, group posts
│       ├── admin.ts       25  dashboard, moderation, roles, audit trail
│       ├── analytics.ts   21  overview, timeseries, GMV, CSV/PDF export
│       ├── genealogy.ts   19  family trees, members, relationships, CSV export
│       ├── messaging.ts   18  conversations, messages, typing, read receipts
│       ├── auth.ts        17  register, login, me, profile, password, users
│       └── skills.ts      16  jobs, mentorship, volunteering
└── tests/e2e.mjs              381 assertions over 16 end-to-end journeys
```

Plus 10 top-level handlers in `index.ts`: `/api/health`, `/api/config`,
`/api/servers`, `/api/realtime`, `/api/realtime/stats`, `/api/media/*` and the
`/api/*` 404 catch-all.

---

## 4. Design decisions

### Authentication — WebCrypto, not bcrypt

Workers have no native Node modules, so `server/routes/auth.js` could not be
ported. Passwords use **PBKDF2-SHA256, 100 000 iterations, 16-byte salt**, stored
as `pbkdf2$iterations$saltB64$hashB64`. Sessions are **HS256 JWTs** signed with
`JWT_SECRET`.

### Realtime — one Durable Object

`RealtimeHub` is a single global object (`global-hub`) holding a `Set` of
connected sockets. Clients speak plain JSON over `ws://…/api/realtime?token=…`:

| Client → server | Server → client |
| --- | --- |
| `{type:"auth", userId}` | `{type:"hello"}` |
| `{type:"subscribe", room}` | `{type:"ready", userId}` |
| `{type:"unsubscribe", room}` | `{type:"subscribed", room}` |
| `{type:"ping"}` | `{type:"pong"}` |
| | `{type:"event", event, room, payload}` |

**Writes go through REST; delivery comes over the socket.** Sending a message
POSTs to `/api/conversations/:id/messages`, which persists to D1 and then
publishes to the hub. Nothing is lost if the socket drops mid-flight, and REST
polling still works if the Durable Object is unavailable (`emit()` is
best-effort).

### Rate limiting — KV sliding window, fails open

`rateLimit(c, bucket, max, windowSeconds)` keys on `cf-connecting-ip` + route
class. Login is `12 / 15 min`; uploads `20 / 60 s`; general `100 / 60 s`. If KV is
unreachable the guard **allows the request** rather than taking the site down.

`RATE_LIMIT_DISABLED=1` (set in `.dev.vars`) bypasses it entirely so the E2E
suite can run back to back from one machine.

### Soft deletes

Nothing is hard-deleted. Posts get `status='deleted'`, orders `'cancelled'`,
products `'archived'`. Every read filters on status.

### JSON in TEXT columns

Array/object columns (`read_by`, `media`, `participants`, `deleted_for`,
`options`) are stored as JSON text and parsed through `jsonList()` / `jsonObj()`.
**They must always be written as valid JSON** — a bare string will break
`json_each()` queries.

### Marketplace constants

```ts
SHIPPING_FLAT     = 1000   // ₦1,000 flat
FREE_SHIPPING_OVER = 50000 // free above ₦50,000
PLATFORM_FEE_RATE = 0.05   // 5% seller commission
```

Order status reaching `delivered` books the seller payout into
`GET /api/payments/balance` as `pending`.

---

## 5. Testing

```bash
# Backend — 381 assertions, 16 journeys, real HTTP against a running Worker
cd worker && BASE=http://127.0.0.1:8787 node tests/e2e.mjs

# Frontend — 21 tests (20 in src/test/app.test.tsx render real pages
#            in jsdom against the same Worker), run with:
WORKER_BASE=http://127.0.0.1:8787 npm test

# Types
cd worker && npx tsc --noEmit
npx tsc -p tsconfig.app.json --noEmit
```

The E2E suite is **re-runnable against the same database**: it registers fresh
accounts with unique suffixes and restocks the seeded catalogue before the
checkout journey.

Coverage: platform health · identity & accounts · social feed/reactions/comments ·
messaging & notifications · groups · events & RSVP · marketplace/cart/checkout ·
seller shop lifecycle · R2 media upload · heritage archive · skills/civic/donations ·
payments & wallet · analytics & recommendations · admin console · search &
discovery · realtime WebSocket.

---

## 6. Known limitations

- **Payments are simulated.** There are no PSP credentials in this environment.
  `POST /api/donations/initialize` returns a local
  `/donations/verify?reference=…` URL and `verify` marks the row `paid`. This is
  testable offline but is **not** a real Paystack/Stripe integration.
- **Scheduled handlers need a flag locally.** Miniflare 3 does not fire cron
  triggers; use `wrangler dev --test-scheduled` to exercise
  `scheduled()` (nightly engagement digests + cleanup).
- **`wrangler.toml` placeholders.** D1 and KV IDs must be replaced before a
  remote deploy.
- **Static-vs-param route ordering.** Hono does *not* prefer a static segment
  over a parameter when earlier path segments are parameters. `/trees/:treeId/members/search`
  is deliberately registered *before* `/trees/:treeId/members/:memberId`. Keep
  that ordering when adding routes.
- **Qualified aggregates.** `order_items` and `orders` both have a `total`
  column; any aggregate over that join must be written `SUM(oi.total)`.
