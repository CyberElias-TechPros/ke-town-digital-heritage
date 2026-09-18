/**
 * Heritage & civic content: news, gallery, directory, contact, newsletter,
 * environment reports, projects, festivals, oral history, elder stories.
 */
import { Hono } from 'hono';
import { newId } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, bool, clampInt, forbidden, jsonList, notFound, num, slugify, str } from '../lib/http';
import { isStaff, requireAuth, requireStaff } from '../middleware';
import { authorRef, serializeGallery, serializeNews, type Row } from '../lib/users';
import { audit, logActivity, notify, trackAnalytics } from '../lib/notify';
import type { Env, AppEnv } from '../types';

export const news = new Hono<AppEnv>();
export const gallery = new Hono<AppEnv>();
export const directory = new Hono<AppEnv>();
export const contact = new Hono<AppEnv>();
export const newsletter = new Hono<AppEnv>();
export const environment = new Hono<AppEnv>();
export const projects = new Hono<AppEnv>();
export const calendar = new Hono<AppEnv>();
export const oralHistory = new Hono<AppEnv>();
export const elderStories = new Hono<AppEnv>();
export const stories = new Hono<AppEnv>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/* ============================== NEWS ============================== */

news.get('/', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('search');
  const limit = clampInt(c.req.query('limit'), 24, 1, 100);
  const where = [`status = 'published'`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (search) {
    where.push('(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM news WHERE ${where.join(' AND ')} ORDER BY featured DESC, published_at DESC LIMIT ?`,
    ...params,
    limit,
  );
  return c.json({ news: rows.map(serializeNews), total: rows.length });
});

news.get('/:id', async (c) => {
  const key = c.req.param('id');
  const row = await first<Row>(c.env.DB, 'SELECT * FROM news WHERE id = ? OR slug = ?', key, key);
  if (!row) throw notFound('Article not found.');
  await run(c.env.DB, 'UPDATE news SET views = views + 1 WHERE id = ?', String(row.id));
  return c.json(serializeNews(row));
});

news.post('/', async (c) => {
  const user = requireStaff(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw badRequest('Headline must be at least 3 characters.');
  const id = newId('nws_');
  await run(
    c.env.DB,
    `INSERT INTO news (id, title, slug, excerpt, content, cover_image, category, tags, author_id, author_name, featured, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
    id,
    title,
    slugify(title),
    String(body.excerpt ?? '').slice(0, 400),
    String(body.content ?? ''),
    String(body.coverImage ?? ''),
    String(body.category ?? 'community'),
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    user.id,
    user.fullName,
    body.featured ? 1 : 0,
    String(body.status ?? 'published'),
  );
  await audit(c.env, { userId: user.id, action: 'news_created', resource: 'news', resourceId: id });
  const row = await first<Row>(c.env.DB, 'SELECT * FROM news WHERE id = ?', id);
  return c.json({ message: 'Article published.', news: serializeNews(row!) }, 201);
});

news.put('/:id', async (c) => {
  requireStaff(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM news WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Article not found.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries({
    title: 'title',
    excerpt: 'excerpt',
    content: 'content',
    coverImage: 'cover_image',
    category: 'category',
    status: 'status',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (body.tags !== undefined) {
    sets.push('tags = ?');
    params.push(JSON.stringify(Array.isArray(body.tags) ? body.tags : []));
  }
  if (body.featured !== undefined) {
    sets.push('featured = ?');
    params.push(body.featured ? 1 : 0);
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.', news: serializeNews(row) });
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE news SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  const updated = await first<Row>(c.env.DB, 'SELECT * FROM news WHERE id = ?', String(row.id));
  return c.json({ message: 'Article updated.', news: serializeNews(updated!) });
});

news.delete('/:id', async (c) => {
  requireStaff(c);
  await run(c.env.DB, `UPDATE news SET status = 'archived' WHERE id = ?`, c.req.param('id'));
  return c.json({ message: 'Article archived.' });
});

/* ============================ GALLERY ============================ */

gallery.get('/', async (c) => {
  const category = c.req.query('category');
  const where = [`approved = 1`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM gallery_items WHERE ${where.join(' AND ')} ORDER BY featured DESC, created_at DESC LIMIT 120`,
    ...params,
  );
  return c.json({ gallery: rows.map(serializeGallery), total: rows.length });
});

gallery.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const url = String(body.url ?? '').trim();
  if (!title) throw badRequest('Give your upload a title.');
  if (!url) throw badRequest('Attach a file first.');
  const id = newId('gal_');
  await run(
    c.env.DB,
    `INSERT INTO gallery_items (id, title, description, url, media_type, thumbnail, category, tags, uploader_id, credit, approved, featured, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    id,
    title,
    String(body.description ?? '').slice(0, 1000),
    url,
    String(body.mediaType ?? (url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image')),
    String(body.thumbnail ?? url),
    String(body.category ?? 'culture'),
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    user.id,
    String(body.credit ?? user.fullName),
    isStaff(user) ? 1 : 0,
  );
  await logActivity(c.env, {
    userId: user.id,
    type: 'gallery_upload',
    targetType: 'gallery',
    targetId: id,
    message: `${user.fullName} contributed “${title}” to the gallery`,
  });
  const row = await first<Row>(c.env.DB, 'SELECT * FROM gallery_items WHERE id = ?', id);
  return c.json(
    {
      message: isStaff(user) ? 'Added to the gallery.' : 'Submitted! A curator will review it shortly.',
      item: serializeGallery(row!),
    },
    201,
  );
});

gallery.put('/:id', async (c) => {
  requireStaff(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM gallery_items WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Gallery item not found.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries({
    title: 'title',
    description: 'description',
    url: 'url',
    thumbnail: 'thumbnail',
    category: 'category',
    credit: 'credit',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  for (const [key, col] of Object.entries({ approved: 'approved', featured: 'featured' })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(body[key] ? 1 : 0);
    }
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.', item: serializeGallery(row) });
  await run(c.env.DB, `UPDATE gallery_items SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  const updated = await first<Row>(c.env.DB, 'SELECT * FROM gallery_items WHERE id = ?', String(row.id));
  return c.json({ message: 'Gallery item updated.', item: serializeGallery(updated!) });
});

gallery.delete('/:id', async (c) => {
  requireStaff(c);
  await run(c.env.DB, 'DELETE FROM gallery_items WHERE id = ?', c.req.param('id'));
  return c.json({ message: 'Gallery item removed.' });
});

/* =========================== DIRECTORY =========================== */

directory.get('/', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('search');
  const where = [`approved = 1`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (search) {
    where.push('(full_name LIKE ? OR profession LIKE ? OR city LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM directory_members WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
    ...params,
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
      avatar: str(r.avatar),
      website: str(r.website),
      linkedin: str(r.linkedin),
      willingToMentor: bool(r.willing_to_mentor),
      createdAt: str(r.created_at),
    })),
    total: rows.length,
  });
});

directory.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (fullName.length < 2) throw badRequest('Please enter your full name.');
  if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address.');
  const dup = await first(c.env.DB, 'SELECT id FROM directory_members WHERE email = ?', email);
  if (dup) throw badRequest('You are already in the directory.');

  const id = newId('dir_');
  await run(
    c.env.DB,
    `INSERT INTO directory_members (id, full_name, email, phone, profession, category, country, city, bio, avatar, website, linkedin, willing_to_mentor, approved, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    id,
    fullName,
    email,
    String(body.phone ?? ''),
    String(body.profession ?? ''),
    String(body.category ?? 'general'),
    String(body.country ?? ''),
    String(body.city ?? ''),
    String(body.bio ?? '').slice(0, 1000),
    String(body.avatar ?? ''),
    String(body.website ?? ''),
    String(body.linkedin ?? ''),
    body.willingToMentor ? 1 : 0,
  );
  return c.json(
    { message: 'Thank you! Your listing is queued for review and will appear shortly.', memberId: id },
    201,
  );
});

/* ============================ CONTACT ============================ */

contact.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const message = String(body.message ?? '').trim();
  if (name.length < 2) throw badRequest('Please tell us your name.');
  if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address so we can reply.');
  if (message.length < 10) throw badRequest('Your message should be at least 10 characters.');

  const id = newId('msg_');
  await run(
    c.env.DB,
    `INSERT INTO contact_messages (id, name, email, subject, message, category, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    name,
    email,
    String(body.subject ?? '').slice(0, 200),
    message.slice(0, 5000),
    String(body.category ?? 'general'),
    c.req.header('cf-connecting-ip') ?? '',
  );
  return c.json(
    { message: 'Message received. The KE Town team replies within 2 working days.', messageId: id },
    201,
  );
});

contact.get('/', async (c) => {
  requireStaff(c);
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200');
  return c.json({
    messages: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      name: str(r.name),
      email: str(r.email),
      subject: str(r.subject),
      message: str(r.message),
      category: str(r.category),
      read: bool(r.read),
      replied: bool(r.replied),
      createdAt: str(r.created_at),
    })),
    total: rows.length,
  });
});

/* ========================== NEWSLETTER ========================== */

newsletter.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address.');
  const existing = await first<Row>(c.env.DB, 'SELECT * FROM newsletter_subscribers WHERE email = ?', email);
  if (existing && String(existing.status) === 'subscribed') {
    return c.json({ message: "You're already subscribed. Watch your inbox!" });
  }
  if (existing) {
    await run(c.env.DB, `UPDATE newsletter_subscribers SET status = 'subscribed' WHERE id = ?`, String(existing.id));
  } else {
    await run(
      c.env.DB,
      `INSERT INTO newsletter_subscribers (id, email, interests, status, created_at) VALUES (?, ?, ?, 'subscribed', datetime('now'))`,
      newId('sub_'),
      email,
      JSON.stringify(Array.isArray(body.interests) ? body.interests : []),
    );
  }
  return c.json({ message: 'Subscribed! Your first digest lands this Friday.' }, 201);
});

newsletter.delete('/:email', async (c) => {
  const email = decodeURIComponent(c.req.param('email')).toLowerCase();
  await run(c.env.DB, `UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE email = ?`, email);
  return c.json({ message: 'Unsubscribed. We are sorry to see you go.' });
});

/* ========================= ENVIRONMENT ========================= */

environment.get('/', async (c) => {
  const category = c.req.query('category');
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM environment_reports ${clause} ORDER BY upvotes DESC, created_at DESC LIMIT 100`,
    ...params,
  );
  return c.json({
    reports: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      title: str(r.title),
      description: str(r.description),
      category: str(r.category),
      severity: str(r.severity),
      location: { name: str(r.location_name), latitude: r.latitude, longitude: r.longitude },
      images: jsonList<string>(r.images),
      reporter: { _id: r.reporter_id ? str(r.reporter_id) : '', fullName: str(r.reporter_name, 'Anonymous') },
      status: str(r.status),
      upvotes: num(r.upvotes),
      createdAt: str(r.created_at),
    })),
    total: rows.length,
  });
});

environment.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 4) throw badRequest('Give your report a clear title.');
  const user = c.get('user');
  const id = newId('env_');
  await run(
    c.env.DB,
    `INSERT INTO environment_reports (id, title, description, category, severity, location_name, latitude, longitude, images, reporter_id, reporter_name, status, upvotes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, datetime('now'))`,
    id,
    title,
    String(body.description ?? '').slice(0, 2000),
    String(body.category ?? 'waste'),
    String(body.severity ?? 'medium'),
    String(body.location?.name ?? body.locationName ?? ''),
    body.location?.latitude ?? body.latitude ?? null,
    body.location?.longitude ?? body.longitude ?? null,
    JSON.stringify(Array.isArray(body.images) ? body.images : []),
    user?.id ?? null,
    user?.fullName ?? String(body.reporterName ?? 'Anonymous'),
  );
  return c.json({ message: 'Report logged. Thank you for protecting the creeks.', reportId: id }, 201);
});

environment.post('/:id/upvote', async (c) => {
  await run(c.env.DB, 'UPDATE environment_reports SET upvotes = upvotes + 1 WHERE id = ?', c.req.param('id'));
  const row = await first<Row>(c.env.DB, 'SELECT upvotes FROM environment_reports WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Report not found.');
  return c.json({ upvotes: num(row.upvotes) });
});

/* =========================== PROJECTS =========================== */

function projectRow(r: Row, updates: Row[] = []): Row {
  const goal = num(r.goal_amount);
  const raised = num(r.raised_amount);
  return {
    _id: String(r.id),
    id: String(r.id),
    title: str(r.title),
    description: str(r.description),
    category: str(r.category),
    coverImage: str(r.cover_image),
    goalAmount: goal,
    raisedAmount: raised,
    currency: str(r.currency, 'NGN'),
    targetDate: r.target_date ? str(r.target_date) : null,
    status: str(r.status),
    progress: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : num(r.progress),
    supporters: num(r.supporters),
    updates: updates.map((u) => ({ _id: String(u.id), text: str(u.text), createdAt: str(u.created_at) })),
    createdAt: str(r.created_at),
  };
}

projects.get('/', async (c) => {
  const rows = await all<Row>(c.env.DB, `SELECT * FROM projects WHERE status <> 'archived' ORDER BY created_at DESC LIMIT 60`);
  const out = [];
  for (const row of rows) {
    const updates = await all<Row>(
      c.env.DB,
      'SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 5',
      String(row.id),
    );
    out.push(projectRow(row, updates));
  }
  return c.json({ projects: out, total: out.length });
});

projects.post('/', async (c) => {
  requireStaff(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw badRequest('Project title is required.');
  const id = newId('prj_');
  await run(
    c.env.DB,
    `INSERT INTO projects (id, title, description, category, cover_image, goal_amount, raised_amount, currency, target_date, status, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'active', 0, datetime('now'), datetime('now'))`,
    id,
    title,
    String(body.description ?? ''),
    String(body.category ?? 'infrastructure'),
    String(body.coverImage ?? ''),
    Number(body.goalAmount ?? 0),
    String(body.currency ?? 'NGN'),
    body.targetDate ? String(body.targetDate) : null,
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM projects WHERE id = ?', id);
  return c.json({ message: 'Project created.', project: projectRow(row!) }, 201);
});

projects.put('/:id', async (c) => {
  requireStaff(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM projects WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Project not found.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries({
    title: 'title',
    description: 'description',
    category: 'category',
    coverImage: 'cover_image',
    status: 'status',
    currency: 'currency',
    targetDate: 'target_date',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (body.goalAmount !== undefined) {
    sets.push('goal_amount = ?');
    params.push(Number(body.goalAmount));
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.', project: projectRow(row) });
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  const updated = await first<Row>(c.env.DB, 'SELECT * FROM projects WHERE id = ?', String(row.id));
  return c.json({ message: 'Project updated.', project: projectRow(updated!) });
});

projects.post('/:id/updates', async (c) => {
  requireStaff(c);
  const text = String((await c.req.json().catch(() => ({}))).text ?? '').trim();
  if (!text) throw badRequest('Update text is required.');
  await run(
    c.env.DB,
    `INSERT INTO project_updates (id, project_id, text, created_at) VALUES (?, ?, ?, datetime('now'))`,
    newId('pup_'),
    c.req.param('id'),
    text,
  );
  return c.json({ message: 'Progress update posted.' }, 201);
});

/* =========================== CALENDAR =========================== */

calendar.get('/', async (c) => {
  const year = c.req.query('year') ? Number(c.req.query('year')) : null;
  const start = c.req.query('start');
  const end = c.req.query('end');
  const type = c.req.query('type');
  const category = c.req.query('category');

  const where: string[] = [`status = 'approved'`];
  const params: (string | number)[] = [];
  if (year) {
    where.push(`strftime('%Y', start_date) = ?`);
    params.push(String(year));
  }
  if (start) {
    where.push('start_date >= ?');
    params.push(new Date(start).toISOString());
  }
  if (end) {
    where.push('start_date <= ?');
    params.push(new Date(end).toISOString());
  }
  if (type && type !== 'all') {
    where.push('event_type = ?');
    params.push(type);
  }
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM events WHERE ${where.join(' AND ')} ORDER BY start_date ASC LIMIT 300`,
    ...params,
  );
  const festivals = await all<Row>(
    c.env.DB,
    year ? 'SELECT * FROM festivals WHERE year = ? OR year IS NULL ORDER BY month, day' : 'SELECT * FROM festivals ORDER BY month, day',
    ...(year ? [year] : []),
  );

  return c.json({
    events: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      title: str(r.title),
      start: str(r.start_date),
      end: r.end_date ? str(r.end_date) : null,
      category: str(r.category),
      type: 'event',
      location: str(r.location_name),
    })),
    festivals: festivals.map((f) => ({
      _id: String(f.id),
      id: String(f.id),
      title: str(f.name),
      start: `${year ?? new Date().getFullYear()}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`,
      category: str(f.category),
      type: 'festival',
      location: str(f.location_name),
    })),
  });
});

calendar.get('/festivals', async (c) => {
  const year = c.req.query('year') ? Number(c.req.query('year')) : new Date().getFullYear();
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM festivals ORDER BY month, day');
  return c.json({
    year,
    festivals: rows.map((f) => ({
      _id: String(f.id),
      id: String(f.id),
      name: str(f.name),
      description: str(f.description),
      month: num(f.month),
      day: num(f.day),
      date: `${year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`,
      category: str(f.category),
      location: str(f.location_name),
      image: str(f.image),
    })),
  });
});

calendar.get('/upcoming', async (c) => {
  const limit = clampInt(c.req.query('limit'), 5, 1, 50);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM events WHERE status = 'approved' AND start_date >= datetime('now') ORDER BY start_date ASC LIMIT ?`,
    limit,
  );
  return c.json(
    rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      title: str(r.title),
      startDate: str(r.start_date),
      location: str(r.location_name),
      category: str(r.category),
      coverImage: str(r.cover_image),
      rsvpCount: num(r.rsvp_count),
    })),
  );
});

calendar.get('/best-time-to-visit', async (c) => {
  return c.json({
    summary: 'November to March is the dry season — calmer creeks, clearer light, and the busiest festival calendar.',
    months: [
      { month: 'November', rating: 5, note: 'Dry season begins. Owu-Aru-Sun celebrations.' },
      { month: 'December', rating: 5, note: 'Peak festival season, masquerade displays.' },
      { month: 'January', rating: 5, note: 'Harmattan light, ideal for photography.' },
      { month: 'February', rating: 4, note: 'Dry, warm, fewer crowds.' },
      { month: 'March', rating: 4, note: 'Rains start late in the month.' },
      { month: 'April', rating: 3, note: 'First rains; lush mangrove scenery.' },
      { month: 'May', rating: 3, note: 'Wet season, quieter waterways.' },
      { month: 'June', rating: 2, note: 'Heavy rains.' },
      { month: 'July', rating: 2, note: 'Heavy rains, some routes impassable.' },
      { month: 'August', rating: 3, note: 'Short dry break (“August break”).' },
      { month: 'September', rating: 3, note: 'Rains easing.' },
      { month: 'October', rating: 4, note: 'Rains end; rivers at their fullest.' },
    ],
  });
});

/* ========================= ORAL HISTORY ========================= */

oralHistory.get('/', async (c) => {
  const category = c.req.query('category');
  const language = c.req.query('language');
  const search = c.req.query('search');
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 20, 1, 100);
  const where = [`approved = 1`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (language && language !== 'all') {
    where.push('language = ?');
    params.push(language);
  }
  if (search) {
    where.push('(title LIKE ? OR transcript LIKE ? OR narrator LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const clause = where.join(' AND ');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM oral_histories WHERE ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );
  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM oral_histories WHERE ${clause}`, ...params);
  return c.json({
    histories: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      title: str(r.title),
      narrator: str(r.narrator),
      category: str(r.category),
      language: str(r.language),
      transcript: str(r.transcript),
      audioUrl: str(r.audio_url),
      videoUrl: str(r.video_url),
      coverImage: str(r.cover_image),
      duration: num(r.duration),
      location: str(r.location_name),
      recordedAt: r.recorded_at ? str(r.recorded_at) : null,
      tags: jsonList<string>(r.tags),
      views: num(r.views),
      createdAt: str(r.created_at),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

oralHistory.get('/:id', async (c) => {
  const row = await first<Row>(c.env.DB, 'SELECT * FROM oral_histories WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Recording not found.');
  await run(c.env.DB, 'UPDATE oral_histories SET views = views + 1 WHERE id = ?', String(row.id));
  return c.json({
    _id: String(row.id),
    id: String(row.id),
    title: str(row.title),
    narrator: str(row.narrator),
    category: str(row.category),
    language: str(row.language),
    transcript: str(row.transcript),
    audioUrl: str(row.audio_url),
    videoUrl: str(row.video_url),
    coverImage: str(row.cover_image),
    duration: num(row.duration),
    location: str(row.location_name),
    recordedAt: row.recorded_at ? str(row.recorded_at) : null,
    tags: jsonList<string>(row.tags),
    views: num(row.views),
    createdAt: str(row.created_at),
  });
});

oralHistory.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw badRequest('Give the recording a title.');
  const id = newId('oral_');
  await run(
    c.env.DB,
    `INSERT INTO oral_histories (id, title, narrator, narrator_id, category, language, transcript, audio_url, video_url, cover_image, duration, location_name, recorded_at, tags, approved, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    title,
    String(body.narrator ?? user.fullName),
    user.id,
    String(body.category ?? 'heritage'),
    String(body.language ?? 'Kalabari'),
    String(body.transcript ?? ''),
    String(body.audioUrl ?? ''),
    String(body.videoUrl ?? ''),
    String(body.coverImage ?? ''),
    Number(body.duration ?? 0),
    String(body.locationName ?? ''),
    body.recordedAt ? String(body.recordedAt) : null,
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    isStaff(user) ? 1 : 0,
  );
  await logActivity(c.env, {
    userId: user.id,
    type: 'oral_history',
    targetType: 'oral_history',
    targetId: id,
    message: `${user.fullName} preserved the recording “${title}”`,
  });
  return c.json({ message: 'Recording saved to the archive.', historyId: id }, 201);
});

/* ========================= ELDER STORIES ========================= */

function elderRow(r: Row): Row {
  return {
    _id: String(r.id),
    id: String(r.id),
    title: str(r.title),
    elderName: str(r.elder_name),
    elderAvatar: str(r.elder_avatar),
    age: r.age === null ? null : num(r.age),
    community: str(r.community),
    excerpt: str(r.excerpt),
    content: str(r.content),
    audioUrl: str(r.audio_url),
    coverImage: str(r.cover_image),
    category: str(r.category),
    language: str(r.language),
    tags: jsonList<string>(r.tags),
    views: num(r.views),
    featured: bool(r.featured),
    status: str(r.status),
    createdAt: str(r.created_at),
  };
}

elderStories.get('/', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM elder_stories WHERE status = 'published' ORDER BY featured DESC, created_at DESC LIMIT 60`,
  );
  return c.json({ stories: rows.map(elderRow), total: rows.length });
});

elderStories.get('/:id', async (c) => {
  const row = await first<Row>(c.env.DB, 'SELECT * FROM elder_stories WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Story not found.');
  await run(c.env.DB, 'UPDATE elder_stories SET views = views + 1 WHERE id = ?', String(row.id));
  return c.json(elderRow(row));
});

elderStories.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const elderName = String(body.elderName ?? '').trim();
  if (title.length < 3) throw badRequest('Story title is required.');
  if (!elderName) throw badRequest("Who is the elder? Their name is required.");
  const id = newId('eld_');
  await run(
    c.env.DB,
    `INSERT INTO elder_stories (id, title, elder_name, elder_avatar, age, community, excerpt, content, audio_url, cover_image, category, language, tags, author_id, featured, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`,
    id,
    title,
    elderName,
    String(body.elderAvatar ?? ''),
    body.age ? Number(body.age) : null,
    String(body.community ?? ''),
    String(body.excerpt ?? '').slice(0, 300),
    String(body.content ?? ''),
    String(body.audioUrl ?? ''),
    String(body.coverImage ?? ''),
    String(body.category ?? 'memoir'),
    String(body.language ?? 'English'),
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    user.id,
    isStaff(user) ? 'published' : 'pending',
  );
  await logActivity(c.env, {
    userId: user.id,
    type: 'elder_story',
    targetType: 'elder_story',
    targetId: id,
    message: `${user.fullName} recorded ${elderName}'s story`,
  });
  return c.json(
    { message: isStaff(user) ? 'Story published.' : 'Story submitted for review.', storyId: id },
    201,
  );
});

elderStories.put('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM elder_stories WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Story not found.');
  if (String(row.author_id) !== user.id && !isStaff(user)) throw forbidden('You can only edit your own submissions.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries({
    title: 'title',
    elderName: 'elder_name',
    elderAvatar: 'elder_avatar',
    community: 'community',
    excerpt: 'excerpt',
    content: 'content',
    audioUrl: 'audio_url',
    coverImage: 'cover_image',
    category: 'category',
    language: 'language',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (body.age !== undefined) {
    sets.push('age = ?');
    params.push(Number(body.age));
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.', story: elderRow(row) });
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE elder_stories SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  const updated = await first<Row>(c.env.DB, 'SELECT * FROM elder_stories WHERE id = ?', String(row.id));
  return c.json({ message: 'Story updated.', story: elderRow(updated!) });
});

elderStories.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM elder_stories WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Story not found.');
  if (String(row.author_id) !== user.id && !isStaff(user)) throw forbidden('You can only delete your own submissions.');
  await run(c.env.DB, `UPDATE elder_stories SET status = 'archived' WHERE id = ?`, String(row.id));
  return c.json({ message: 'Story archived.' });
});

/* ============================ STORIES ============================ */

stories.get('/', async (c) => {
  const category = c.req.query('category');
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await all<Row>(c.env.DB, `SELECT * FROM stories ${clause} ORDER BY created_at DESC LIMIT 60`, ...params);
  return c.json({
    stories: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      title: str(r.title),
      body: str(r.body),
      era: str(r.era),
      category: str(r.category),
      coverImage: str(r.cover_image),
      views: num(r.views),
      createdAt: str(r.created_at),
    })),
  });
});

stories.get('/:id', async (c) => {
  const row = await first<Row>(c.env.DB, 'SELECT * FROM stories WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Story not found.');
  await run(c.env.DB, 'UPDATE stories SET views = views + 1 WHERE id = ?', String(row.id));
  return c.json({
    _id: String(row.id),
    id: String(row.id),
    title: str(row.title),
    body: str(row.body),
    era: str(row.era),
    category: str(row.category),
    coverImage: str(row.cover_image),
    views: num(row.views),
  });
});

/* =========================== PHRASES =========================== */

export const phrases = new Hono<AppEnv>();

phrases.get('/', async (c) => {
  const category = c.req.query('category');
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await all<Row>(c.env.DB, `SELECT * FROM phrases ${clause} ORDER BY category, phrase`, ...params);
  return c.json({
    phrases: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      phrase: str(r.phrase),
      translation: str(r.translation),
      language: str(r.language),
      category: str(r.category),
      audioUrl: str(r.audio_url),
    })),
  });
});

phrases.post('/', async (c) => {
  const user = requireStaff(c);
  const body = await c.req.json().catch(() => ({}));
  const phrase = String(body.phrase ?? '').trim();
  const translation = String(body.translation ?? '').trim();
  if (!phrase || !translation) throw badRequest('Both the phrase and its translation are required.');
  const id = newId('phr_');
  await run(
    c.env.DB,
    `INSERT INTO phrases (id, phrase, translation, language, category, audio_url, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    phrase,
    translation,
    String(body.language ?? 'Kalabari'),
    String(body.category ?? 'greetings'),
    String(body.audioUrl ?? ''),
  );
  return c.json({ message: 'Phrase added to the phrasebook.', phraseId: id }, 201);
});

export { authorRef, notify, trackAnalytics };
