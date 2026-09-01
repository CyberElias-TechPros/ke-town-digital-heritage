# KE Kingdom — Cloudflare Worker backend

A Cloudflare Workers REST API + Durable Object backend for KE Kingdom Digital Heritage.

## Stack

- **Cloudflare Workers** — HTTP API (`src/index.js` router)
- **D1** — SQLite relational database (`migrations/0001_init.sql`)
- **R2** — media / uploads (`src/routes/upload.js`)
- **KV** — caching / config (binding `CACHE`)
- **Durable Object** — real-time chat, presence, typing (`src/chat.js`)
- **Web Crypto** — HS256 JWTs (`src/lib/auth.js`) and PBKDF2 password hashing (`src/lib/password.js`)

## Layout

```
src/
  index.js             # entry: router, CORS, cron, WebSocket → DO
  chat.js              # ChatDurableObject (WebSockets)
  lib/
    auth.js            # JWT sign/verify + token hashing
    password.js        # PBKDF2 password hashing
    http.js            # JSON/CORS/error helpers
    db.js              # D1 helpers (id, json, query)
    middleware.js      # requireUser + role helpers
  routes/
    auth.js users.js social.js community.js commerce.js
    content.js misc.js search.js admin.js upload.js
migrations/0001_init.sql
seed.sql
wrangler.toml
```

## Local development

```bash
npm install
npx wrangler d1 migrations apply ke_kingdom --local
npx wrangler dev --port 8787 --local
```

The frontend's Vite dev server proxies `/api` → `http://localhost:8787`.

## Tests

```bash
npm test        # node --test test/lib.test.mjs  (password + JWT primitives)
```

## Configuration

See `wrangler.toml` for bindings. Set secrets with `npx wrangler secret put`:

- `JWT_SECRET` (required)
- `ENVIRONMENT` (set to `production` in prod)

Apply migrations with `npx wrangler d1 migrations apply ke_kingdom --local|--remote`.

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for end-to-end deployment.
