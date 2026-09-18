/**
 * Admin console endpoints + global search + R2 media uploads.
 */
import { Hono } from 'hono';
import { newId, sha256Hex } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, clampInt, forbidden, jsonList, notFound, num, str } from '../lib/http';
import { isStaff, requireAuth, requireStaff } from '../middleware';
import { serializeEvent, serializeGallery, serializeNews, serializeProduct, type Row } from '../lib/users';
import { audit, notify } from '../lib/notify';
import type { Env, AppEnv } from '../types';

export const admin = new Hono<AppEnv>();
export const search = new Hono<AppEnv>();
export const upload = new Hono<AppEnv>();

/* ============================== ADMIN ============================== */

admin.get('/dashboard', async (c) => {
  requireStaff(c);
  const [
    totalUsers,
    newUsersToday,
    activeUsers,
    sellers,
    totalPosts,
    totalProducts,
    totalOrders,
    revenue,
    pendingGallery,
    pendingDirectory,
    openReports,
    unreadContacts,
    pendingStories,
    pendingMentorships,
    subscribers,
  ] = await Promise.all([
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM users'),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', 'start of day')`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM users WHERE account_status = 'active'`),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM users WHERE is_seller = 1'),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM posts WHERE status = 'active'`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM products WHERE status = 'active'`),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM orders'),
    first<{ total: number }>(c.env.DB, `SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE payment_status = 'paid'`),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM gallery_items WHERE approved = 0'),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM directory_members WHERE approved = 0'),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM reports WHERE status = 'pending'`),
    count(c.env.DB, 'SELECT COUNT(*) AS n FROM contact_messages WHERE read = 0'),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM elder_stories WHERE status = 'pending'`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM mentorship_requests WHERE status = 'pending'`),
    count(c.env.DB, `SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE status = 'subscribed'`),
  ]);

  return c.json({
    stats: {
      totalUsers,
      newUsersToday,
      activeUsers,
      sellers,
      totalPosts,
      totalProducts,
      totalOrders,
      totalRevenue: Number(revenue?.total ?? 0),
      newsletterSubscribers: subscribers,
    },
    moderation: {
      pendingGallery,
      pendingDirectory,
      openReports,
      unreadContacts,
      pendingStories,
      pendingMentorships,
    },
    recentActivity: (
      await all<Row>(c.env.DB, 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10')
    ).map((r) => ({
      _id: String(r.id),
      action: str(r.action),
      resource: r.resource ? str(r.resource) : null,
      createdAt: str(r.created_at),
    })),
  });
});

admin.get('/events', async (c) => {
  requireStaff(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM events ORDER BY created_at DESC LIMIT 100');
  return c.json({ events: await Promise.all(rows.map((r) => serializeEvent(c.env.DB, r))), total: rows.length });
});

admin.get('/news', async (c) => {
  requireStaff(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM news ORDER BY created_at DESC LIMIT 100');
  return c.json({ news: rows.map(serializeNews), total: rows.length });
});

admin.get('/gallery', async (c) => {
  requireStaff(c);
  const approved = c.req.query('approved');
  const rows = await all<Row>(
    c.env.DB,
    approved === undefined
      ? 'SELECT * FROM gallery_items ORDER BY created_at DESC LIMIT 200'
      : 'SELECT * FROM gallery_items WHERE approved = ? ORDER BY created_at DESC LIMIT 200',
    ...(approved === undefined ? [] : [approved === 'true' ? 1 : 0]),
  );
  return c.json({ gallery: rows.map(serializeGallery), total: rows.length });
});

admin.put('/gallery/:id/approve', async (c) => {
  const actor = requireStaff(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM gallery_items WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Gallery item not found.');
  await run(c.env.DB, 'UPDATE gallery_items SET approved = 1 WHERE id = ?', String(row.id));
  await audit(c.env, { userId: actor.id, action: 'gallery_approved', resource: 'gallery', resourceId: String(row.id) });
  if (row.uploader_id) {
    await notify(c.env, {
      userId: String(row.uploader_id),
      fromId: actor.id,
      type: 'gallery',
      message: `Your contribution “${String(row.title)}” is now live in the gallery`,
      link: '/gallery',
    });
  }
  return c.json({ message: 'Gallery item approved.' });
});

admin.get('/directory', async (c) => {
  requireStaff(c);
  const approved = c.req.query('approved');
  const rows = await all<Row>(
    c.env.DB,
    approved === undefined
      ? 'SELECT * FROM directory_members ORDER BY created_at DESC LIMIT 200'
      : 'SELECT * FROM directory_members WHERE approved = ? ORDER BY created_at DESC LIMIT 200',
    ...(approved === undefined ? [] : [approved === 'true' ? 1 : 0]),
  );
  return c.json({
    members: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      fullName: str(r.full_name),
      email: str(r.email),
      phone: str(r.phone),
      profession: str(r.profession),
      category: str(r.category),
      country: str(r.country),
      city: str(r.city),
      bio: str(r.bio),
      approved: r.approved === 1,
      createdAt: str(r.created_at),
    })),
    total: rows.length,
  });
});

admin.put('/directory/:id/approve', async (c) => {
  const actor = requireStaff(c);
  await run(c.env.DB, 'UPDATE directory_members SET approved = 1 WHERE id = ?', c.req.param('id'));
  await audit(c.env, { userId: actor.id, action: 'directory_approved', resource: 'directory', resourceId: c.req.param('id') });
  return c.json({ message: 'Directory listing approved.' });
});

admin.get('/contacts', async (c) => {
  requireStaff(c);
  const read = c.req.query('read');
  const rows = await all<Row>(
    c.env.DB,
    read === undefined
      ? 'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200'
      : 'SELECT * FROM contact_messages WHERE read = ? ORDER BY created_at DESC LIMIT 200',
    ...(read === undefined ? [] : [read === 'true' ? 1 : 0]),
  );
  return c.json({
    contacts: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      name: str(r.name),
      email: str(r.email),
      subject: str(r.subject),
      message: str(r.message),
      category: str(r.category),
      read: r.read === 1,
      createdAt: str(r.created_at),
    })),
    total: rows.length,
  });
});

admin.put('/contacts/:id/read', async (c) => {
  requireStaff(c);
  await run(c.env.DB, 'UPDATE contact_messages SET read = 1 WHERE id = ?', c.req.param('id'));
  return c.json({ message: 'Marked as read.' });
});

admin.get('/environment', async (c) => {
  requireStaff(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM environment_reports ORDER BY created_at DESC LIMIT 100');
  return c.json({
    reports: rows.map((r) => ({
      _id: String(r.id),
      title: str(r.title),
      category: str(r.category),
      severity: str(r.severity),
      location: str(r.location_name),
      status: str(r.status),
      upvotes: num(r.upvotes),
      createdAt: str(r.created_at),
    })),
  });
});

admin.put('/environment/:id/status', async (c) => {
  requireStaff(c);
  const status = String((await c.req.json().catch(() => ({}))).status ?? 'in_progress');
  await run(c.env.DB, 'UPDATE environment_reports SET status = ? WHERE id = ?', status, c.req.param('id'));
  return c.json({ message: `Report marked ${status}.`, status });
});

admin.get('/projects', async (c) => {
  requireStaff(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM projects ORDER BY created_at DESC LIMIT 100');
  return c.json({
    projects: rows.map((r) => ({
      _id: String(r.id),
      title: str(r.title),
      goalAmount: num(r.goal_amount),
      raisedAmount: num(r.raised_amount),
      status: str(r.status),
      createdAt: str(r.created_at),
    })),
  });
});

admin.put('/projects/:id/status', async (c) => {
  requireStaff(c);
  const status = String((await c.req.json().catch(() => ({}))).status ?? 'active');
  await run(c.env.DB, `UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?`, status, c.req.param('id'));
  return c.json({ message: `Project marked ${status}.`, status });
});

admin.post('/projects/:id/updates', async (c) => {
  const actor = requireStaff(c);
  const text = String((await c.req.json().catch(() => ({}))).text ?? '').trim();
  if (!text) throw badRequest('Update text is required.');
  await run(
    c.env.DB,
    `INSERT INTO project_updates (id, project_id, text, author_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
    newId('pup_'),
    c.req.param('id'),
    text,
    actor.id,
  );
  return c.json({ message: 'Progress update posted.' }, 201);
});

admin.get('/products', async (c) => {
  requireStaff(c);
  const rows = await all<Row>(c.env.DB, `SELECT * FROM products ORDER BY created_at DESC LIMIT 100`);
  return c.json({ products: await Promise.all(rows.map((r) => serializeProduct(c.env.DB, r))), total: rows.length });
});

admin.put('/products/:id/status', async (c) => {
  const actor = requireStaff(c);
  const status = String((await c.req.json().catch(() => ({}))).status ?? 'active');
  if (!['active', 'paused', 'removed'].includes(status)) throw badRequest('Unknown status.');
  await run(c.env.DB, `UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ?`, status, c.req.param('id'));
  await audit(c.env, { userId: actor.id, action: 'product_status', resource: 'product', resourceId: c.req.param('id') });
  return c.json({ message: `Listing marked ${status}.`, status });
});

admin.get('/reports', async (c) => {
  requireStaff(c);
  const rows = await all<Row>(c.env.DB, `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100`);
  return c.json({ reports: rows, total: rows.length });
});

admin.delete('/:resource/:id', async (c) => {
  const actor = requireStaff(c);
  const resource = c.req.param('resource');
  const id = c.req.param('id');
  const softDeletes: Record<string, string> = {
    posts: `UPDATE posts SET status = 'deleted' WHERE id = ?`,
    events: `UPDATE events SET status = 'cancelled' WHERE id = ?`,
    products: `UPDATE products SET status = 'deleted' WHERE id = ?`,
    groups: `UPDATE groups SET status = 'archived' WHERE id = ?`,
    news: `UPDATE news SET status = 'archived' WHERE id = ?`,
  };
  const sql = softDeletes[resource];
  if (!sql) throw badRequest(`Cannot remove resource type “${resource}”.`);
  await run(c.env.DB, sql, id);
  await audit(c.env, { userId: actor.id, action: 'admin_delete', resource, resourceId: id });
  return c.json({ message: `${resource} removed.` });
});

/* ============================== SEARCH ============================== */

search.get('/suggestions', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  if (q.length < 2) return c.json({ suggestions: [] });
  const like = `%${q}%`;
  const [users, posts, products, events, groups] = await Promise.all([
    all<Row>(c.env.DB, `SELECT full_name, username, avatar FROM users WHERE account_status = 'active' AND (full_name LIKE ? OR username LIKE ?) LIMIT 5`, like, like),
    all<Row>(c.env.DB, `SELECT id, content FROM posts WHERE status = 'active' AND content LIKE ? LIMIT 5`, like),
    all<Row>(c.env.DB, `SELECT id, title, category FROM products WHERE status = 'active' AND title LIKE ? LIMIT 5`, like),
    all<Row>(c.env.DB, `SELECT id, title FROM events WHERE status = 'approved' AND title LIKE ? LIMIT 5`, like),
    all<Row>(c.env.DB, `SELECT id, name FROM groups WHERE status = 'active' AND name LIKE ? LIMIT 5`, like),
  ]);
  return c.json({
    suggestions: [
      ...users.map((u) => ({ type: 'user', label: str(u.full_name), sub: u.username ? `@${str(u.username)}` : '', avatar: str(u.avatar), link: `/profile/${str(u.username ?? '')}` })),
      ...posts.map((p) => ({ type: 'post', label: str(p.content).slice(0, 60), sub: 'Post', link: `/posts` })),
      ...products.map((p) => ({ type: 'product', label: str(p.title), sub: str(p.category), link: `/product/${str(p.id)}` })),
      ...events.map((e) => ({ type: 'event', label: str(e.title), sub: 'Event', link: `/events/${str(e.id)}` })),
      ...groups.map((g) => ({ type: 'group', label: str(g.name), sub: 'Group', link: `/groups/${str(g.id)}` })),
    ].slice(0, 12),
  });
});

search.get('/', async (c) => {
  const user = c.get('user');
  const q = (c.req.query('q') ?? '').trim();
  const type = c.req.query('type') ?? 'all';
  const limit = clampInt(c.req.query('limit'), 12, 1, 50);
  if (!q) {
    return c.json({ query: '', results: [], counts: {}, total: 0 });
  }
  const like = `%${q}%`;
  const results: Row[] = [];
  const counts: Record<string, number> = {};

  if (type === 'all' || type === 'users') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM users WHERE account_status = 'active' AND (full_name LIKE ? OR username LIKE ? OR bio LIKE ? OR shop_name LIKE ?) LIMIT ?`,
      like,
      like,
      like,
      like,
      limit,
    );
    counts.users = rows.length;
    for (const r of rows) {
      results.push({
        type: 'user',
        _id: String(r.id),
        id: String(r.id),
        fullName: str(r.full_name),
        username: r.username ? str(r.username) : null,
        avatar: str(r.avatar),
        bio: str(r.bio),
        link: `/profile/${str(r.username ?? r.id)}`,
      });
    }
  }

  if (type === 'all' || type === 'posts') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM posts WHERE status = 'active' AND visibility IN ('community','public') AND content LIKE ? ORDER BY created_at DESC LIMIT ?`,
      like,
      limit,
    );
    counts.posts = rows.length;
    for (const r of rows) {
      results.push({
        type: 'post',
        _id: String(r.id),
        id: String(r.id),
        title: str(r.content).slice(0, 120),
        link: '/posts',
      });
    }
  }

  if (type === 'all' || type === 'products') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM products WHERE status = 'active' AND (title LIKE ? OR description LIKE ? OR tags LIKE ? OR category LIKE ?) ORDER BY views DESC LIMIT ?`,
      like,
      like,
      like,
      like,
      limit,
    );
    counts.products = rows.length;
    for (const r of rows) {
      const serialized = await serializeProduct(c.env.DB, r, user?.id ?? null);
      results.push({
        type: 'product',
        _id: String(r.id),
        id: String(r.id),
        title: str(r.title),
        price: num(r.price),
        currency: str(r.currency, 'NGN'),
        image: jsonList<string>(r.images)[0] ?? '/placeholder.svg',
        category: str(r.category),
        seller: serialized.seller,
        link: `/product/${String(r.id)}`,
      });
    }
  }

  if (type === 'all' || type === 'events') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM events WHERE status = 'approved' AND (title LIKE ? OR description LIKE ? OR location_name LIKE ?) ORDER BY start_date ASC LIMIT ?`,
      like,
      like,
      like,
      limit,
    );
    counts.events = rows.length;
    for (const r of rows) {
      results.push({
        type: 'event',
        _id: String(r.id),
        id: String(r.id),
        title: str(r.title),
        startDate: str(r.start_date),
        location: str(r.location_name),
        image: str(r.cover_image),
        link: `/events/${String(r.id)}`,
      });
    }
  }

  if (type === 'all' || type === 'groups') {
    const rows = await all<Row>(
      c.env.DB,
      `SELECT * FROM groups WHERE status = 'active' AND privacy <> 'secret' AND (name LIKE ? OR description LIKE ?) LIMIT ?`,
      like,
      like,
      limit,
    );
    counts.groups = rows.length;
    for (const r of rows) {
      results.push({
        type: 'group',
        _id: String(r.id),
        id: String(r.id),
        title: str(r.name),
        description: str(r.description).slice(0, 140),
        memberCount: num(r.member_count),
        link: `/groups/${String(r.id)}`,
      });
    }
  }

  if (type === 'all' || type === 'heritage') {
    const [newsRows, galleryRows, oralRows, elderRows] = await Promise.all([
      all<Row>(c.env.DB, `SELECT * FROM news WHERE status = 'published' AND (title LIKE ? OR excerpt LIKE ?) LIMIT ?`, like, like, limit),
      all<Row>(c.env.DB, `SELECT * FROM gallery_items WHERE approved = 1 AND (title LIKE ? OR description LIKE ?) LIMIT ?`, like, like, limit),
      all<Row>(c.env.DB, `SELECT * FROM oral_histories WHERE approved = 1 AND (title LIKE ? OR transcript LIKE ?) LIMIT ?`, like, like, limit),
      all<Row>(c.env.DB, `SELECT * FROM elder_stories WHERE status = 'published' AND (title LIKE ? OR content LIKE ? OR elder_name LIKE ?) LIMIT ?`, like, like, like, limit),
    ]);
    counts.heritage = newsRows.length + galleryRows.length + oralRows.length + elderRows.length;
    for (const r of newsRows) results.push({ type: 'news', _id: String(r.id), id: String(r.id), title: str(r.title), image: str(r.cover_image), link: `/history` });
    for (const r of galleryRows) results.push({ type: 'gallery', _id: String(r.id), id: String(r.id), title: str(r.title), image: str(r.url), link: `/gallery` });
    for (const r of oralRows) results.push({ type: 'oral-history', _id: String(r.id), id: String(r.id), title: str(r.title), link: `/elder-stories` });
    for (const r of elderRows) results.push({ type: 'elder-story', _id: String(r.id), id: String(r.id), title: str(r.title), image: str(r.cover_image), link: `/elder-stories` });
  }

  return c.json({ query: q, results, counts, total: results.length });
});

/* ============================== UPLOAD ============================== */

const MAX_UPLOAD = 25 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpe?g|gif|webp|avif|svg\+xml)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|webm|wav|ogg)|application\/pdf)$/i;

function extFrom(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name ?? '');
  return match ? match[1].toLowerCase() : 'bin';
}

async function storeFile(xenv: Env, file: File, ownerId: string | null): Promise<Row> {
  if (file.size === 0) throw badRequest('That file is empty.');
  if (file.size > MAX_UPLOAD) throw badRequest('Files must be 25 MB or smaller.');
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED.test(mime)) throw badRequest(`Unsupported file type “${mime}”. Upload an image, video, audio or PDF file.`);

  const key = `${ownerId ?? 'anon'}/${new Date().toISOString().slice(0, 10)}/${newId('m_')}.${extFrom(file.name)}`;
  const hash = await sha256Hex(`${key}:${file.size}:${file.name}`);

  await xenv.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { ownerId: ownerId ?? 'anon', originalName: file.name, hash },
  });

  const url = `/api/media/${key}`;
  const id = newId('med_');
  await run(
    xenv.DB,
    `INSERT INTO media (id, owner_id, key, url, filename, mime_type, size, kind, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    ownerId,
    key,
    url,
    file.name,
    mime,
    file.size,
    mime.startsWith('image') ? 'image' : mime.startsWith('video') ? 'video' : mime.startsWith('audio') ? 'audio' : 'document',
  );

  return {
    _id: id,
    id,
    url,
    key,
    filename: file.name,
    mimeType: mime,
    size: file.size,
    type: mime.startsWith('image') ? 'image' : mime.startsWith('video') ? 'video' : mime.startsWith('audio') ? 'audio' : 'document',
  };
}

upload.post('/single', async (c) => {
  const user = await requireAuth(c);
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw badRequest('Attach a file under the field name “file”.');
  const stored = await storeFile(c.env, file, user.id);
  return c.json({ message: 'Upload complete.', file: stored, ...stored }, 201);
});

upload.post('/multiple', async (c) => {
  const user = await requireAuth(c);
  const form = await c.req.parseBody({ all: true });
  const files = (Array.isArray(form.files) ? form.files : [form.files]).filter((f): f is File => f instanceof File);
  if (!files.length) throw badRequest('Attach one or more files under the field name “files”.');
  if (files.length > 10) throw badRequest('Upload at most 10 files at a time.');
  const stored = [];
  for (const file of files) stored.push(await storeFile(c.env, file, user.id));
  return c.json({ message: `${stored.length} files uploaded.`, files: stored }, 201);
});

upload.get('/mine', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM media WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100', user.id);
  return c.json({
    files: rows.map((r) => ({
      _id: String(r.id),
      url: str(r.url),
      key: str(r.key),
      filename: str(r.filename),
      mimeType: str(r.mime_type),
      size: num(r.size),
      kind: str(r.kind),
      createdAt: str(r.created_at),
    })),
  });
});

/** Streams an object out of R2. Mounted at /api/media/:key+ by the root router. */
export async function serveMedia(xenv: Env, key: string, request: Request): Promise<Response> {
  const object = await xenv.MEDIA.get(key);
  if (!object) throw notFound('File not found.');
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (object.httpMetadata?.contentType) headers.set('content-type', object.httpMetadata.contentType);

  const range = request.headers.get('range');
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : object.size - 1;
      const partial = await xenv.MEDIA.get(key, { range: { offset: start, length: end - start + 1 } });
      if (partial) {
        headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
        headers.set('accept-ranges', 'bytes');
        return new Response(partial.body, { status: 206, headers });
      }
    }
  }
  headers.set('accept-ranges', 'bytes');
  return new Response(object.body, { headers });
}

export { isStaff, requireStaff, requireAuth };
