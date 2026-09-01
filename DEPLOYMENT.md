# KE Kingdom Digital Heritage — Deployment Guide

This application has two deployable parts:

- **Frontend** (React + Vite + shadcn/ui) → **Vercel**
- **Backend** (Cloudflare Workers REST API + Durable Objects) → **Cloudflare**

The frontend and backend are fully decoupled. The backend lives in [`worker/`](./worker).

---

## 1. Cloudflare backend

### Prerequisites

- Node 18+ and the [`wrangler` CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`).
- A Cloudflare account.

### 1a. Create the resources

```bash
cd worker
npx wrangler login

# D1 database
npx wrangler d1 create ke_kingdom
# -> note the database_id output and put it in wrangler.toml

# KV namespace (caching / config)
npx wrangler kv namespace create KE_KINGDOM
# -> put the id in wrangler.toml under [[kv_namespaces]]

# R2 bucket (uploads / media)
npx wrangler r2 bucket create ke-kingdom-media
```

Edit `worker/wrangler.toml` and replace the placeholder `database_id` and KV `id`.

### 1b. Set secrets

```bash
# Long random JWT secret
npx wrangler secret put JWT_SECRET     # e.g. openssl rand -hex 32
npx wrangler secret put ENVIRONMENT    # production
```

### 1c. Run migrations (local + remote)

```bash
npx wrangler d1 migrations apply ke_kingdom --local
npx wrangler d1 migrations apply ke_kingdom --remote
```

### 1d. Seed initial data (optional)

```bash
npx wrangler d1 execute ke_kingdom --remote --file=./seed.sql
```

The seed creates an **admin** account: `admin@kingdom.com.ng` / `Admin123!`.
**Change this password immediately** (`/settings` → change password).

### 1e. Deploy

```bash
cd worker
npm install
npx wrangler deploy
```

The Worker will be available at `https://ke-kingdom-api.<your-subdomain>.workers.dev`.
This is the base URL the frontend must call.

### 1f. Local development

```bash
cd worker
npx wrangler dev --port 8787 --local
```

This runs the Worker with a **local** D1/R2/KV/Durable Object simulation (Miniflare),
which is exactly how this repository was verified end-to-end.

### Bindings summary

| Binding | Type            | Purpose                                   |
| ------- | --------------- | ----------------------------------------- |
| `DB`    | D1              | All relational data                        |
| `MEDIA` | R2              | Uploaded files / images / documents        |
| `CACHE` | KV              | Caching / configuration                    |
| `CHAT`  | Durable Object  | Real-time messaging, presence, typing      |

### Cron

The Worker has a scheduled trigger (`0 3 * * *`) that deletes expired auth tokens.

---

## 2. Frontend (Vercel)

### 2a. Build & environment

The build command is `npm run build` (outputs to `dist/`). `vercel.json` is already
configured with SPA rewrites, security headers and static caching.

Set the following environment variable in the Vercel project:

```
VITE_API_SERVERS = https://ke-kingdom-api.<your-subdomain>.workers.dev
```

The frontend calls `${VITE_API_SERVERS}/api/...`. If you set it to `self`, the app
expects `/api` to be served from the same origin (used for local dev with the
Vite proxy; **do not** use `self` on Vercel).

### 2b. Deploy

```bash
npm install
vercel --prod          # or push to a Git repo connected to Vercel
```

### 2c. Optional frontend env vars

- `VITE_STRIPE_PUBLISHABLE_KEY` — used by the payments UI (falls back to a test key).

---

## 3. Verifying the deployment

- Frontend health: `https://<your-vercel-app>.vercel.app/`
- Backend health: `https://ke-kingdom-api.<sub>.workers.dev/api/health` → `{"status":"ok"}`
- Sign up / log in → posts, feed, groups, events, marketplace, messages, notifications.

**Route parity audit:** with a local Worker running, `./route-probe.sh` registers a
throwaway user and exercises all 131 API paths the frontend calls, reporting any
that fail. Run it to confirm every endpoint is reachable before/after deploy.

---

## 4. Email / notifications

Cloudflare Workers have no built-in SMTP. To send real emails (contact form,
password reset links, notifications), add an **Email Worker** or integrate a
transactional email provider, then deliver the `resetToken` from
`POST /api/auth/forgot-password` via that channel. In local dev the reset token is
returned in the response so the flow can be tested end-to-end.

---

## 5. Security notes

- Passwords are hashed with PBKDF2-SHA256 (100k iterations) via Web Crypto — never stored in plaintext.
- Sessions are signed JWTs (HS256) stored in `localStorage`; the server re-validates identity and role on every request.
- Authorization (admin/mod/seller/content roles) is enforced **server-side**.
- Uploads are validated by MIME type and a 10 MB size cap, and stored in R2 (not in the database).
- Set `JWT_SECRET` to a strong random value in production.
