# KE Kingdom Digital Heritage

A digital heritage platform preserving 1,200+ years of **Kalabari** culture — history,
culture, language, elder stories, gallery, events, groups, marketplace and a global
diaspora community.

**Architecture**

- **Frontend:** React + Vite + TypeScript + shadcn/ui + TanStack Query (hosted on **Vercel**)
- **Backend:** Cloudflare Workers REST API + Durable Objects over **Cloudflare D1** (SQLite),
  **R2** (media), **KV** (config), with JWT auth and PBKDF2 password hashing
- **Real-time:** a `ChatDurableObject` provides live messaging / presence / typing over WebSockets

```
Browser → Vercel (React SPA) → Cloudflare Worker (/api) → D1 + R2 + KV
                                                          └── Durable Object (chat)
```

## Getting started

### Frontend

```bash
npm install
npm run dev        # http://localhost:8080 (proxies /api → local Worker)
```

Set `VITE_API_SERVERS` (see below).

### Backend (local)

```bash
cd worker
npm install
npx wrangler d1 migrations apply ke_kingdom --local
npx wrangler dev --port 8787 --local
```

### Environment

| Variable           | Frontend | Purpose                                              |
| ------------------ | -------- | ---------------------------------------------------- |
| `VITE_API_SERVERS` | ✅       | Backend base URL. `self` = same-origin (dev proxy); otherwise the Worker URL. |

Set `VITE_API_SERVERS` to the deployed Worker URL in production (e.g.
`https://ke-kingdom-api.<subdomain>.workers.dev`).

## Scripts

Frontend: `npm run build`, `npm run lint`, `npm test`, `npm run dev`.

Backend: `npm run dev` (wrangler), `npm run deploy`, `npm test`,
`npm run db:migrate:local|remote`.

## Documentation

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — full Vercel + Cloudflare deployment steps
- [`worker/README.md`](./worker/README.md) — backend structure and configuration
- `worker/migrations/0001_init.sql` — database schema
- `worker/seed.sql` — initial content + seed admin (`admin@kingdom.com.ng` / `Admin123!`)

> The legacy Node/Express backend under `server/` is superseded by the Cloudflare
> Worker. It is retained for reference only.
