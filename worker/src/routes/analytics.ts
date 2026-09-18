/**
 * Analytics, dashboards and the recommendation engine.
 * Everything is computed from D1 — no external BI service required.
 */
import { Hono } from 'hono';
import { newId } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, clampInt, num } from '../lib/http';
import { isStaff, requireAuth, requireStaff } from '../middleware';
import { serializeEvent, serializePost, serializeProduct, type Row } from '../lib/users';
import type { Env, AppEnv } from '../types';

export const analytics = new Hono<AppEnv>();
export const ai = new Hono<AppEnv>();

const RANGE_DAYS: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

function daysFromRange(range: string | undefined): number {
  return RANGE_DAYS[String(range ?? '30d')] ?? 30;
}

async function timeSeries(db: D1Database, eventType: string | null, days: number): Promise<{ date: string; value: number }[]> {
  const rows = await all<{ d: string; n: number }>(
    db,
    `SELECT date(created_at) AS d, COUNT(*) AS n
       FROM analytics_events
      WHERE created_at >= datetime('now', ?) AND (? IS NULL OR event_type = ?)
      GROUP BY d ORDER BY d ASC`,
    `-${days} days`,
    eventType,
    eventType,
  );
  const map = new Map(rows.map((r) => [String(r.d), Number(r.n)]));
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date: d, value: map.get(d) ?? 0 });
  }
  return out;
}

analytics.get('/', async (c) => {
  requireAuth(c);
  const days = daysFromRange(c.req.query('timeRange'));
  const [
    users,
    posts,
    products,
    orders,
    events,
    revenue,
    pageviews,
    signups,
  ] = await Promise.all([
    count(c.env.DB, `SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', ?)`, `-${days} days`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM posts WHERE created_at >= datetime('now', ?)`, `-${days} days`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM products WHERE created_at >= datetime('now', ?)`, `-${days} days`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM orders WHERE created_at >= datetime('now', ?)`, `-${days} days`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM events WHERE created_at >= datetime('now', ?)`, `-${days} days`),
    first<{ total: number }>(
      c.env.DB,
      `SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE created_at >= datetime('now', ?)`,
      `-${days} days`,
    ),
    first<{ n: number }>(
      c.env.DB,
      `SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'page_view' AND created_at >= datetime('now', ?)`,
      `-${days} days`,
    ),
    first<{ n: number }>(
      c.env.DB,
      `SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'signup' AND created_at >= datetime('now', ?)`,
      `-${days} days`,
    ),
  ]);

  return c.json({
    timeRange: `${days}d`,
    summary: {
      newUsers: users,
      newPosts: posts,
      newListings: products,
      newOrders: orders,
      newEvents: events,
      revenue: Number(revenue?.total ?? 0),
      pageViews: Number(pageviews?.n ?? 0),
      signups: Number(signups?.n ?? 0),
    },
    timeline: await timeSeries(c.env.DB, null, Math.min(days, 90)),
    currency: 'NGN',
  });
});

analytics.get('/overview', async (c) => {
  requireAuth(c);
  const [totalUsers, totalPosts, totalProducts, totalOrders, totalEvents, revenue, openReports, pendingGallery] = await Promise.all([
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM users'),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM posts WHERE status = 'active'`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM products WHERE status = 'active'`),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM orders'),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM events'),
    first<{ total: number }>(c.env.DB, `SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE payment_status = 'paid'`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM reports WHERE status = 'pending'`),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM gallery_items WHERE approved = 0'),
  ]);
  return c.json({
    totalUsers,
    totalPosts,
    totalProducts,
    totalOrders,
    totalEvents,
    totalRevenue: Number(revenue?.total ?? 0),
    openReports,
    pendingGallery,
    currency: 'NGN',
  });
});

analytics.get('/users', async (c) => {
  requireAuth(c);
  const days = daysFromRange(c.req.query('timeRange'));
  const growth = await timeSeries(c.env.DB, 'signup', Math.min(days, 90));
  const byRole = await all<{ role: string; n: number }>(c.env.DB, 'SELECT role, COUNT(*) AS n FROM users GROUP BY role');
  const active = await count(c.env.DB, `SELECT COUNT(*) AS n FROM posts WHERE created_at >= datetime('now', ?)`, `-${days} days`);
  return c.json({
    growth,
    byRole: byRole.map((r) => ({ role: String(r.role), count: Number(r.n) })),
    activeContributions: active,
    sellers: await count(c.env.DB, 'SELECT COUNT(*) AS n FROM users WHERE is_seller = 1'),
    mentors: await count(c.env.DB, 'SELECT COUNT(*) AS n FROM mentor_profiles WHERE active = 1'),
  });
});

analytics.get('/content', async (c) => {
  requireAuth(c);
  const days = daysFromRange(c.req.query('timeRange'));
  const topPosts = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts WHERE status = 'active' ORDER BY (like_count * 3 + comment_count * 4) DESC LIMIT 10`,
  );
  const byType = await all<{ event_type: string; n: number }>(
    c.env.DB,
    `SELECT event_type, COUNT(*) AS n FROM analytics_events WHERE created_at >= datetime('now', ?) GROUP BY event_type ORDER BY n DESC`,
    `-${days} days`,
  );
  return c.json({
    topPosts: await Promise.all(topPosts.map((p) => serializePost(c.env.DB, p))),
    eventsByType: byType.map((r) => ({ type: String(r.event_type), count: Number(r.n) })),
    timeline: await timeSeries(c.env.DB, 'post_created', Math.min(days, 90)),
  });
});

analytics.get('/marketplace', async (c) => {
  requireAuth(c);
  const days = daysFromRange(c.req.query('timeRange'));
  const [listings, sold, gmv, byCategory] = await Promise.all([
    count(c.env.DB, `SELECT COUNT(*) AS n FROM products WHERE status = 'active'`),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM order_items'),
    first<{ total: number }>(c.env.DB, `SELECT COALESCE(SUM(total), 0) AS total FROM order_items`),
    all<{ category: string; n: number; revenue: number }>(
      c.env.DB,
      `SELECT p.category AS category, COUNT(*) AS n, COALESCE(SUM(oi.total), 0) AS revenue
         FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id
        GROUP BY p.category ORDER BY n DESC`,
    ),
  ]);
  return c.json({
    activeListings: listings,
    itemsSold: sold,
    gmv: Number(gmv?.total ?? 0),
    byCategory: byCategory.map((r) => ({ category: String(r.category), listings: Number(r.n), revenue: Number(r.revenue) })),
    timeline: await timeSeries(c.env.DB, 'order_placed', Math.min(days, 90)),
    currency: 'NGN',
  });
});

analytics.get('/events', async (c) => {
  requireAuth(c);
  const days = daysFromRange(c.req.query('timeRange'));
  const upcoming = await count(c.env.DB, `SELECT COUNT(*) AS n FROM events WHERE start_date >= datetime('now')`);
  const rsvps = await count(c.env.DB, `SELECT COUNT(*) AS n FROM event_rsvps WHERE created_at >= datetime('now', ?)`, `-${days} days`);
  const byCategory = await all<{ category: string; n: number }>(
    c.env.DB,
    'SELECT category, COUNT(*) AS n FROM events GROUP BY category ORDER BY n DESC',
  );
  return c.json({
    upcomingEvents: upcoming,
    newRsvps: rsvps,
    byCategory: byCategory.map((r) => ({ category: String(r.category), count: Number(r.n) })),
    timeline: await timeSeries(c.env.DB, 'event_rsvp', Math.min(days, 90)),
  });
});

analytics.get('/cultural', async (c) => {
  requireAuth(c);
  const [gallery, oral, elder, trees, phrases] = await Promise.all([
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM gallery_items'),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM oral_histories'),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM elder_stories'),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM family_trees'),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM phrases'),
  ]);
  const byCategory = await all<{ category: string; n: number }>(
    c.env.DB,
    'SELECT category, COUNT(*) AS n FROM gallery_items GROUP BY category ORDER BY n DESC',
  );
  return c.json({
    galleryItems: gallery,
    oralHistories: oral,
    elderStories: elder,
    familyTrees: trees,
    phrases,
    galleryByCategory: byCategory.map((r) => ({ category: String(r.category), count: Number(r.n) })),
  });
});

analytics.get('/realtime', async (c) => {
  requireAuth(c);
  const [activeNow, todayViews, todaySignups] = await Promise.all([
    count(c.env.DB, `SELECT COUNT(*) AS n FROM users WHERE last_seen >= datetime('now', '-10 minutes')`),
    first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM analytics_events WHERE created_at >= datetime('now', 'start of day')`),
    first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', 'start of day')`),
  ]);
  return c.json({
    activeNow,
    eventsToday: Number(todayViews?.n ?? 0),
    signupsToday: Number(todaySignups?.n ?? 0),
    serverTime: new Date().toISOString(),
  });
});

analytics.get('/export', async (c) => {
  requireAuth(c);
  const days = daysFromRange(c.req.query('timeRange'));
  const format = c.req.query('format') ?? 'json';
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM analytics_events WHERE created_at >= datetime('now', ?) ORDER BY created_at DESC LIMIT 5000`,
    `-${days} days`,
  );
  const payload = { generatedAt: new Date().toISOString(), timeRange: `${days}d`, events: rows };

  if (format === 'csv') {
    const header = 'id,user_id,event_type,entity_type,entity_id,country,device,value,created_at\n';
    const body = rows
      .map((r) =>
        [r.id, r.user_id ?? '', r.event_type, r.entity_type, r.entity_id, r.country, r.device, r.value, r.created_at]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    return c.body(header + body, 200, { 'content-type': 'text/csv; charset=utf-8' });
  }
  if (format === 'pdf') {
    // A printable HTML report — opens the browser print dialog as PDF.
    const html = `<!doctype html><meta charset="utf-8"><title>KE Town Analytics</title>
      <style>body{font:14px/1.5 system-ui,sans-serif;padding:32px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px}</style>
      <h1>KE Town Digital Heritage — Analytics</h1>
      <p>Range: last ${days} days · Generated ${new Date().toISOString()}</p>
      <table><thead><tr><th>Event</th><th>Entity</th><th>Country</th><th>Device</th><th>Value</th><th>When</th></tr></thead>
      <tbody>${rows
        .slice(0, 300)
        .map(
          (r) =>
            `<tr><td>${r.event_type}</td><td>${r.entity_type} ${r.entity_id}</td><td>${r.country}</td><td>${r.device}</td><td>${r.value}</td><td>${r.created_at}</td></tr>`,
        )
        .join('')}</tbody></table>`;
    return c.body(html, 200, { 'content-type': 'text/html; charset=utf-8' });
  }
  return c.json(payload);
});

analytics.post('/custom', async (c) => {
  requireAuth(c);
  const config = await c.req.json().catch(() => ({}));
  const metrics: string[] = Array.isArray(config.metrics) ? config.metrics : ['users', 'posts', 'orders'];
  const days = daysFromRange(config.timeRange);
  const result: Record<string, unknown> = { timeRange: `${days}d`, metrics: {} };
  const queries: Record<string, string> = {
    users: `SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', ?)`,
    posts: `SELECT COUNT(*) AS n FROM posts WHERE created_at >= datetime('now', ?)`,
    orders: `SELECT COUNT(*) AS n FROM orders WHERE created_at >= datetime('now', ?)`,
    revenue: `SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE created_at >= datetime('now', ?)`,
    products: `SELECT COUNT(*) AS n FROM products WHERE created_at >= datetime('now', ?)`,
    events: `SELECT COUNT(*) AS n FROM events WHERE created_at >= datetime('now', ?)`,
    donations: `SELECT COALESCE(SUM(amount), 0) AS n FROM donations WHERE status = 'paid' AND created_at >= datetime('now', ?)`,
  };
  for (const metric of metrics) {
    const sql = queries[metric];
    if (!sql) continue;
    const row = await first<{ n: number }>(c.env.DB, sql, `-${days} days`);
    (result.metrics as Record<string, number>)[metric] = Number(row?.n ?? 0);
  }
  result.timeline = await timeSeries(c.env.DB, null, Math.min(days, 90));
  return c.json(result);
});

/* ====================== RECOMMENDATION ENGINE ====================== */

const INTEREST_KEYWORDS: Record<string, string[]> = {
  culture: ['masquerade', 'culture', 'kalabari', 'heritage', 'dance', 'festival'],
  history: ['history', 'timeline', 'war canoe', 'ancestor', 'kingdom'],
  marketplace: ['buy', 'sell', 'price', 'craft', 'textile', 'jewelry'],
  events: ['event', 'meetup', 'festival', 'gathering'],
  environment: ['mangrove', 'creek', 'environment', 'clean', 'water'],
  education: ['skill', 'training', 'mentor', 'learn', 'academy'],
};

function scoreContent(text: string, interests: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const interest of interests) {
    for (const kw of INTEREST_KEYWORDS[interest] ?? [interest]) {
      if (lower.includes(kw)) score += 3;
    }
  }
  return score;
}

ai.get('/recommendations', async (c) => {
  const user = await requireAuth(c);
  const type = c.req.query('type') ?? 'all';
  const dismissed = new Set(
    (
      await all<{ recommendation_id: string }>(
        c.env.DB,
        `SELECT recommendation_id FROM recommendation_events WHERE user_id = ? AND action = 'dismiss'`,
        user.id,
      )
    ).map((r) => r.recommendation_id),
  );

  const out: Row[] = [];

  if (type === 'all' || type === 'posts') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM posts WHERE status = 'active' AND author_id <> ? AND visibility IN ('community','public')
        ORDER BY (like_count * 2 + comment_count * 3) DESC, created_at DESC LIMIT 30`,
      user.id,
    );
    for (const row of rows) {
      const score = scoreContent(String(row.content), user.interests) + num(row.like_count) * 0.1;
      out.push({
        _id: `post:${row.id}`,
        id: `post:${row.id}`,
        type: 'post',
        score: Math.round(score * 10) / 10,
        reason: user.interests.length ? 'Matches your interests' : 'Trending in your community',
        content: await serializePost(c.env.DB, row, user.id),
      });
    }
  }

  if (type === 'all' || type === 'products') {
    const rows = await all<Row>(c.env.DB, `SELECT * FROM products WHERE status = 'active' ORDER BY views DESC LIMIT 20`);
    for (const row of rows) {
      out.push({
        _id: `product:${row.id}`,
        id: `product:${row.id}`,
        type: 'product',
        score: Math.round((scoreContent(`${row.title} ${row.category}`, user.interests) + num(row.views) * 0.01) * 10) / 10,
        reason: `Popular in ${String(row.category)}`,
        content: await serializeProduct(c.env.DB, row, user.id),
      });
    }
  }

  if (type === 'all' || type === 'events') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM events WHERE status = 'approved' AND start_date >= datetime('now') ORDER BY start_date ASC LIMIT 15`,
    );
    for (const row of rows) {
      out.push({
        _id: `event:${row.id}`,
        id: `event:${row.id}`,
        type: 'event',
        score: Math.round((scoreContent(`${row.title} ${row.description}`, user.interests) + num(row.rsvp_count) * 0.2) * 10) / 10,
        reason: 'Happening soon near you',
        content: await serializeEvent(c.env.DB, row, user.id),
      });
    }
  }

  if (type === 'all' || type === 'people') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT u.* FROM users u WHERE u.account_status = 'active' AND u.id <> ?
         AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY u.verified DESC LIMIT 10`,
      user.id,
      user.id,
    );
    for (const row of rows) {
      out.push({
        _id: `user:${row.id}`,
        id: `user:${row.id}`,
        type: 'person',
        score: row.verified === 1 ? 5 : 2,
        reason: 'Active community member',
        content: {
          _id: String(row.id),
          id: String(row.id),
          fullName: String(row.full_name),
          avatar: String(row.avatar),
          bio: String(row.bio),
          username: row.username ? String(row.username) : null,
        },
      });
    }
  }

  const ranked = out
    .filter((r) => !dismissed.has(String(r._id)))
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 24);

  return c.json({ recommendations: ranked, total: ranked.length });
});

ai.get('/profile', async (c) => {
  const user = await requireAuth(c);
  return c.json({
    interests: user.interests,
    skills: user.skills,
    location: user.location,
    language: user.language,
  });
});

ai.put('/profile', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const interests = Array.isArray(body.interests) ? body.interests.slice(0, 20).map(String) : user.interests;
  const skills = Array.isArray(body.skills) ? body.skills.slice(0, 20).map(String) : user.skills;
  await run(
    c.env.DB,
    `UPDATE users SET interests = ?, skills = ?, updated_at = datetime('now') WHERE id = ?`,
    JSON.stringify(interests),
    JSON.stringify(skills),
    user.id,
  );
  return c.json({ message: 'Preferences saved. Your feed will adapt.', interests, skills });
});

ai.post('/track', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const recommendationId = String(body.recommendationId ?? '');
  if (!recommendationId) throw badRequest('recommendationId is required.');
  await run(
    c.env.DB,
    `INSERT INTO recommendation_events (id, user_id, recommendation_id, entity_type, action, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    newId('rec_'),
    user.id,
    recommendationId,
    String(body.type ?? recommendationId.split(':')[0] ?? ''),
    String(body.action ?? 'impression'),
  );
  return c.json({ ok: true });
});

ai.post('/recommendations/:id/dismiss', async (c) => {
  const user = await requireAuth(c);
  await run(
    c.env.DB,
    `INSERT INTO recommendation_events (id, user_id, recommendation_id, action, created_at)
     VALUES (?, ?, ?, 'dismiss', datetime('now'))`,
    newId('rec_'),
    user.id,
    c.req.param('id'),
  );
  return c.json({ message: 'Dismissed. We will show less like this.', dismissed: true });
});

ai.post('/recommendations/:id/feedback', async (c) => {
  const user = await requireAuth(c);
  const feedback = String((await c.req.json().catch(() => ({}))).feedback ?? 'like');
  if (!['like', 'dislike', 'not_interested'].includes(feedback)) throw badRequest('Unknown feedback value.');
  await run(
    c.env.DB,
    `INSERT INTO recommendation_events (id, user_id, recommendation_id, action, feedback, created_at)
     VALUES (?, ?, ?, 'feedback', ?, datetime('now'))`,
    newId('rec_'),
    user.id,
    c.req.param('id'),
    feedback,
  );
  return c.json({ message: 'Thanks — that helps tune your feed.', feedback });
});

ai.get('/similar/:type/:contentId', async (c) => {
  const user = c.get('user');
  const type = c.req.param('type');
  const id = c.req.param('contentId');
  const limit = clampInt(c.req.query('limit'), 6, 1, 20);

  if (type === 'product') {
    const row = await first<Row>(c.env.DB, 'SELECT * FROM products WHERE id = ?', id);
    if (!row) return c.json({ similar: [] });
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM products WHERE category = ? AND id <> ? AND status = 'active' ORDER BY views DESC LIMIT ?`,
      String(row.category),
      id,
      limit,
    );
    return c.json({ similar: await Promise.all(rows.map((r) => serializeProduct(c.env.DB, r, user?.id ?? null))) });
  }
  if (type === 'event') {
    const row = await first<Row>(c.env.DB, 'SELECT * FROM events WHERE id = ?', id);
    if (!row) return c.json({ similar: [] });
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM events WHERE category = ? AND id <> ? AND status = 'approved' ORDER BY start_date ASC LIMIT ?`,
      String(row.category),
      id,
      limit,
    );
    return c.json({ similar: await Promise.all(rows.map((r) => serializeEvent(c.env.DB, r, user?.id ?? null))) });
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts WHERE id <> ? AND status = 'active' ORDER BY like_count DESC LIMIT ?`,
    id,
    limit,
  );
  return c.json({ similar: await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user?.id ?? null))) });
});

ai.get('/trending', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category');
  const params: (string | number)[] = [];
  let clause = `status = 'active' AND visibility IN ('community','public')`;
  if (category && category !== 'all') {
    clause += ' AND feeling = ?';
    params.push(category);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts WHERE ${clause} ORDER BY (like_count * 3 + comment_count * 4 + view_count) DESC LIMIT 12`,
    ...params,
  );
  return c.json({ trending: await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user?.id ?? null))) });
});

ai.get('/feed', async (c) => {
  const user = await requireAuth(c);
  const limit = clampInt(c.req.query('limit'), 20, 1, 60);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT p.*,
            (SELECT COUNT(*) FROM follows f WHERE f.following_id = p.author_id AND f.follower_id = ?) AS following_author
       FROM posts p
      WHERE p.status = 'active' AND p.visibility IN ('community','public')
      ORDER BY (following_author * 10 + like_count * 0.5 + comment_count) DESC, p.created_at DESC
      LIMIT ?`,
    user.id,
    limit,
  );
  return c.json(await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user.id))));
});

export { isStaff, requireStaff };
