/**
 * KE Town Digital Heritage — Cloudflare Worker entrypoint.
 *
 * One Worker serves:
 *   • the JSON API under /api/*
 *   • realtime WebSocket upgrades under /api/realtime
 *   • the built SPA (dist) for every other path
 *
 * Stack: Hono + D1 (SQLite) + R2 (media) + KV (rate limit/cache) +
 *        Durable Objects (realtime fan-out) + Cron (nightly digest).
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

import { auth } from './routes/auth';
import { comments, posts, social, users } from './routes/social';
import { conversations, messages, notifications } from './routes/messaging';
import { events, groups } from './routes/groups';
import { addresses, cart, marketplace, orders, reviews, shop } from './routes/marketplace';
import {
  calendar,
  contact,
  directory,
  elderStories,
  environment,
  gallery,
  news,
  newsletter,
  oralHistory,
  phrases,
  projects,
  stories,
} from './routes/heritage';
import { genealogy } from './routes/genealogy';
import { jobs, mentorship, volunteer } from './routes/skills';
import { campaigns, donations, payments, petitions, polls, reports } from './routes/civic';
import { ai, analytics } from './routes/analytics';
import { admin, search, serveMedia, upload } from './routes/admin';
import { attachUser, jwtSecret, rateLimit } from './middleware';
import { ApiError, num } from './lib/http';
import { all, first, run } from './lib/db';
import { verifyJwt } from './lib/jwt';
import { notify } from './lib/notify';
import { RealtimeHub } from './realtime';
import type { AppEnv, Env } from './types';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin ?? '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'Content-Range'],
    maxAge: 86400,
    credentials: true,
  }),
);
app.use('/api/*', secureHeaders());
app.use('/api/*', attachUser);

/* ------------------------------ meta ------------------------------ */

app.get('/api/health', async (c) => {
  let database = 'ok';
  try {
    await first(c.env.DB, 'SELECT 1 AS x');
  } catch {
    database = 'unavailable';
  }
  return c.json({
    status: database === 'ok' ? 'ok' : 'degraded',
    service: c.env.APP_NAME ?? 'KE Town Digital Heritage',
    platform: 'cloudflare-workers',
    database,
    version: '1.0.0',
    colo: (c.req.raw as Request & { cf?: { colo?: string } }).cf?.colo ?? 'local',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (c) =>
  c.json({
    appName: c.env.APP_NAME ?? 'KE Town Digital Heritage',
    appUrl: c.env.APP_URL ?? '',
    currency: c.env.DEFAULT_CURRENCY ?? 'NGN',
    realtimePath: '/api/realtime',
    uploadMaxBytes: Number(c.env.UPLOAD_MAX_BYTES ?? 10485760),
    features: {
      marketplace: true,
      groups: true,
      events: true,
      messaging: true,
      genealogy: true,
      donations: true,
      mentorship: true,
      analytics: true,
    },
  }),
);

/** Legacy multi-server contract kept so older clients keep working. */
app.get('/api/servers', (c) => c.json({ primary: c.env.APP_URL ?? '', secondary: '' }));

/* --------------------------- realtime WS --------------------------- */

app.get('/api/realtime', async (c) => {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') {
    return c.json({
      message: 'Open a WebSocket here to receive live events.',
      protocol: {
        inbound: ['auth', 'subscribe', 'unsubscribe', 'ping'],
        outbound: ['hello', 'ready', 'subscribed', 'pong', 'event'],
      },
    });
  }
  const url = new URL(c.req.url);
  const token = url.searchParams.get('token') ?? '';
  let userId = url.searchParams.get('userId') ?? '';
  if (token && !userId) {
    const payload = await verifyJwt(jwtSecret(c.env), token);
    if (payload?.sub) userId = String(payload.sub);
  }
  const stub = c.env.REALTIME.get(c.env.REALTIME.idFromName('global-hub'));
  const proxyUrl = new URL('https://realtime.internal/ws');
  proxyUrl.searchParams.set('userId', userId);
  return stub.fetch(proxyUrl.toString(), c.req.raw);
});

app.get('/api/realtime/stats', async (c) => {
  const stub = c.env.REALTIME.get(c.env.REALTIME.idFromName('global-hub'));
  const res = await stub.fetch('https://realtime.internal/stats');
  return c.json(await res.json());
});

/* ---------------------------- R2 media ---------------------------- */

app.get('/api/media/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/media\//, ''));
  if (!key) return c.json({ error: 'File key required' }, 400);
  return serveMedia(c.env, key, c.req.raw);
});

/* ---------------------------- write guard -------------------------- */

app.use('/api/*', async (c, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
    await rateLimit(c, 'write', 120, 60);
  }
  await next();
});

/* ------------------------------ routes ----------------------------- */

app.route('/api/auth', auth);

app.route('/api/posts', posts);
app.route('/api/comments', comments);
app.route('/api/social', social);
app.route('/api/users', users);

app.route('/api/conversations', conversations);
app.route('/api/messages', messages);
app.route('/api/notifications', notifications);

app.route('/api/groups', groups);
app.route('/api/events', events);

app.route('/api/marketplace', marketplace);
app.route('/api/cart', cart);
app.route('/api/orders', orders);
app.route('/api/shop', shop);
app.route('/api/addresses', addresses);
app.route('/api/reviews', reviews);

app.route('/api/news', news);
app.route('/api/gallery', gallery);
app.route('/api/directory', directory);
app.route('/api/contact', contact);
app.route('/api/newsletter', newsletter);
app.route('/api/environment', environment);
app.route('/api/projects', projects);
app.route('/api/calendar', calendar);
app.route('/api/oral-history', oralHistory);
app.route('/api/elder-stories', elderStories);
app.route('/api/stories', stories);
app.route('/api/phrases', phrases);
app.route('/api/genealogy', genealogy);

app.route('/api/jobs', jobs);
app.route('/api/mentorship', mentorship);
app.route('/api/volunteer', volunteer);

app.route('/api/polls', polls);
app.route('/api/petitions', petitions);
app.route('/api/campaigns', campaigns);
app.route('/api/donations', donations);
app.route('/api/reports', reports);
app.route('/api/payments', payments);

app.route('/api/analytics', analytics);
app.route('/api/ai', ai);

app.route('/api/admin', admin);
app.route('/api/search', search);
app.route('/api/upload', upload);

// Anything under /api that no router matched is a 404 JSON response,
// never an HTML page — keeps client-side error parsing predictable.
app.all('/api/*', (c) =>
  c.json({ error: `No API route for ${c.req.method} ${new URL(c.req.url).pathname}` }, 404),
);

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: err.message, details: err.details }, err.status as 400);
  }
  console.error('Unhandled API error', err);
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500);
});

/* ------------------------------- SPA ------------------------------- */

app.all('*', async (c) => {
  if (c.req.path.startsWith('/api/')) return c.notFound();
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,

  /** Nightly engagement digest + housekeeping. */
  async scheduled(_event: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        // 1. Tell members with unread activity what they missed.
        const idle = await all<{ id: string; full_name: string }>(
          env.DB,
          `SELECT id, full_name FROM users
            WHERE account_status = 'active'
              AND (last_seen IS NULL OR last_seen < datetime('now', '-7 days'))`,
        );
        for (const user of idle.slice(0, 500)) {
          const unread = await first<{ n: number }>(
            env.DB,
            'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0',
            user.id,
          );
          if (num(unread?.n) > 0) {
            await notify(env, {
              userId: user.id,
              type: 'digest',
              title: 'While you were away',
              message: `You have ${unread!.n} unread ${num(unread?.n) === 1 ? 'notification' : 'notifications'}.`,
              link: '/notifications',
            });
          }
        }

        // 2. Close polls and petitions past their deadline.
        await run(env.DB, `UPDATE polls SET status = 'closed' WHERE closes_at IS NOT NULL AND closes_at < datetime('now') AND status = 'open'`);

        // 3. Mark delivered orders complete after the grace window.
        await run(
          env.DB,
          `UPDATE orders SET order_status = 'completed', updated_at = datetime('now')
            WHERE order_status = 'delivered' AND updated_at < datetime('now', '-14 days')`,
        );

        // 4. Promote seller pending balance into spendable balance.
        await run(
          env.DB,
          `UPDATE users SET balance = balance + pending_balance, pending_balance = 0
            WHERE pending_balance > 0`,
        );
      })(),
    );
  },
};

export { RealtimeHub };
