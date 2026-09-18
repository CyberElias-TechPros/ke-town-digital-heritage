/**
 * Skills & opportunity: jobs, mentorship, volunteering.
 */
import { Hono } from 'hono';
import { newId } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, clampInt, forbidden, jsonList, notFound, num, str } from '../lib/http';
import { isStaff, requireAuth } from '../middleware';
import { authorMap, loadUser, publicUser, type Row } from '../lib/users';
import { logActivity, notify } from '../lib/notify';
import type { Env, AppEnv } from '../types';

export const jobs = new Hono<AppEnv>();
export const mentorship = new Hono<AppEnv>();
export const volunteer = new Hono<AppEnv>();

function jobRow(r: Row): Row {
  return {
    _id: String(r.id),
    id: String(r.id),
    title: str(r.title),
    company: str(r.company),
    description: str(r.description),
    requirements: jsonList<string>(r.requirements),
    responsibilities: jsonList<string>(r.responsibilities),
    category: str(r.category),
    type: str(r.job_type),
    jobType: str(r.job_type),
    location: str(r.location_name),
    remote: r.remote === 1,
    salaryMin: r.salary_min === null ? null : num(r.salary_min),
    salaryMax: r.salary_max === null ? null : num(r.salary_max),
    currency: str(r.currency, 'NGN'),
    contactEmail: str(r.contact_email),
    deadline: r.deadline ? str(r.deadline) : null,
    views: num(r.views),
    applications: num(r.applications),
    status: str(r.status),
    createdAt: str(r.created_at),
  };
}

/* ============================== JOBS ============================== */

jobs.get('/', async (c) => {
  const type = c.req.query('type');
  const category = c.req.query('category');
  const location = c.req.query('location');
  const search = c.req.query('search');
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 20, 1, 100);

  const where = [`status = 'open'`];
  const params: (string | number)[] = [];
  if (type && type !== 'all') {
    where.push('job_type = ?');
    params.push(type);
  }
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (location && location !== 'all') {
    where.push('(location_name LIKE ? OR remote = 1)');
    params.push(`%${location}%`);
  }
  if (search) {
    where.push('(title LIKE ? OR company LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const clause = where.join(' AND ');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM jobs WHERE ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );
  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM jobs WHERE ${clause}`, ...params);
  return c.json({ jobs: rows.map(jobRow), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

jobs.get('/:id', async (c) => {
  const row = await first<Row>(c.env.DB, 'SELECT * FROM jobs WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Job not found.');
  await run(c.env.DB, 'UPDATE jobs SET views = views + 1 WHERE id = ?', String(row.id));
  const related = await all<Row>(
    c.env.DB,
    `SELECT * FROM jobs WHERE category = ? AND id <> ? AND status = 'open' ORDER BY created_at DESC LIMIT 4`,
    String(row.category),
    String(row.id),
  );
  return c.json({ ...jobRow(row), related: related.map(jobRow) });
});

jobs.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw badRequest('Job title is required.');
  if (!String(body.description ?? '').trim()) throw badRequest('Describe the role so applicants know what to expect.');

  const id = newId('job_');
  await run(
    c.env.DB,
    `INSERT INTO jobs (id, title, company, description, requirements, responsibilities, category, job_type, location_name, remote,
                       salary_min, salary_max, currency, poster_id, contact_email, deadline, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'), datetime('now'))`,
    id,
    title,
    String(body.company ?? user.shopName ?? user.fullName),
    String(body.description ?? ''),
    JSON.stringify(Array.isArray(body.requirements) ? body.requirements : []),
    JSON.stringify(Array.isArray(body.responsibilities) ? body.responsibilities : []),
    String(body.category ?? 'technology'),
    String(body.type ?? body.jobType ?? 'full_time'),
    String(body.location ?? body.locationName ?? ''),
    body.remote ? 1 : 0,
    body.salaryMin ? Number(body.salaryMin) : null,
    body.salaryMax ? Number(body.salaryMax) : null,
    String(body.currency ?? 'NGN'),
    user.id,
    String(body.contactEmail ?? user.email ?? ''),
    body.deadline ? String(body.deadline) : null,
  );
  await logActivity(c.env, {
    userId: user.id,
    type: 'job_posted',
    targetType: 'job',
    targetId: id,
    message: `${user.fullName} posted the role “${title}”`,
  });
  const row = await first<Row>(c.env.DB, 'SELECT * FROM jobs WHERE id = ?', id);
  return c.json({ message: 'Role published.', job: jobRow(row!) }, 201);
});

jobs.put('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM jobs WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Job not found.');
  if (String(row.poster_id) !== user.id && !isStaff(user)) throw forbidden('You can only edit roles you posted.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const [key, col] of Object.entries({
    title: 'title',
    company: 'company',
    description: 'description',
    category: 'category',
    locationName: 'location_name',
    contactEmail: 'contact_email',
    deadline: 'deadline',
    status: 'status',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (body.type !== undefined) {
    sets.push('job_type = ?');
    params.push(String(body.type));
  }
  if (!sets.length) return c.json({ message: 'Nothing to update.', job: jobRow(row) });
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  const updated = await first<Row>(c.env.DB, 'SELECT * FROM jobs WHERE id = ?', String(row.id));
  return c.json({ message: 'Role updated.', job: jobRow(updated!) });
});

jobs.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM jobs WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Job not found.');
  if (String(row.poster_id) !== user.id && !isStaff(user)) throw forbidden('You can only close roles you posted.');
  await run(c.env.DB, `UPDATE jobs SET status = 'closed', updated_at = datetime('now') WHERE id = ?`, String(row.id));
  return c.json({ message: 'Role closed.' });
});

jobs.post('/:id/apply', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM jobs WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Job not found.');
  if (String(row.status) !== 'open') throw badRequest('This role is no longer accepting applications.');
  const body = await c.req.json().catch(() => ({}));
  const exists = await first(c.env.DB, 'SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?', String(row.id), user.id);
  if (exists) throw badRequest('You have already applied for this role.');

  await run(
    c.env.DB,
    `INSERT INTO job_applications (id, job_id, user_id, cover_letter, resume_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
    newId('app_'),
    String(row.id),
    user.id,
    String(body.coverLetter ?? '').slice(0, 4000),
    String(body.resumeUrl ?? ''),
  );
  await run(c.env.DB, 'UPDATE jobs SET applications = applications + 1 WHERE id = ?', String(row.id));
  if (row.poster_id) {
    await notify(c.env, {
      userId: String(row.poster_id),
      fromId: user.id,
      type: 'job_application',
      message: `${user.fullName} applied for “${String(row.title)}”`,
      link: `/seller`,
    });
  }
  return c.json({ message: 'Application sent. The recruiter will reach out if you are shortlisted.' }, 201);
});

jobs.get('/:id/applications', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM jobs WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Job not found.');
  if (String(row.poster_id) !== user.id && !isStaff(user)) throw forbidden('Only the recruiter can see applicants.');
  const rows = await all<Row>(c.env.DB, 'SELECT * FROM job_applications WHERE job_id = ? ORDER BY created_at DESC', String(row.id));
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.user_id)));
  return c.json(
    rows.map((r) => ({
      _id: String(r.id),
      applicant: map.get(String(r.user_id)),
      coverLetter: str(r.cover_letter),
      resumeUrl: str(r.resume_url),
      status: str(r.status),
      createdAt: str(r.created_at),
    })),
  );
});

/* =========================== MENTORSHIP =========================== */

async function mentorProfileRow(db: D1Database, r: Row): Promise<Row> {
  const user = await loadUser(db, String(r.user_id));
  return {
    _id: String(r.id),
    id: String(r.id),
    user: user ? publicUser(user) : null,
    userId: String(r.user_id),
    skills: jsonList<string>(r.skills),
    expertise: str(r.expertise),
    yearsExperience: num(r.years_experience),
    bio: str(r.bio),
    availability: str(r.availability),
    languages: jsonList<string>(r.languages),
    hourlyRate: num(r.hourly_rate),
    rating: num(r.rating),
    sessions: num(r.sessions_count),
    active: r.active === 1,
    createdAt: str(r.created_at),
  };
}

mentorship.get('/mentors', async (c) => {
  const skill = c.req.query('skill');
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 20, 1, 100);
  const where = [`active = 1`];
  const params: (string | number)[] = [];
  if (skill && skill !== 'all') {
    where.push('(skills LIKE ? OR expertise LIKE ?)');
    params.push(`%${skill}%`, `%${skill}%`);
  }
  const clause = where.join(' AND ');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM mentor_profiles WHERE ${clause} ORDER BY rating DESC, sessions_count DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );
  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM mentor_profiles WHERE ${clause}`, ...params);
  return c.json({
    mentors: await Promise.all(rows.map((r) => mentorProfileRow(c.env.DB, r))),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

mentorship.get('/mentees', async (c) => {
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 20, 1, 100);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM mentorship_requests WHERE status = 'accepted' ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    limit,
    (page - 1) * limit,
  );
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.mentee_id)));
  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM mentorship_requests WHERE status = 'accepted'`);
  return c.json({
    mentees: rows.map((r) => ({
      _id: String(r.id),
      user: map.get(String(r.mentee_id)),
      mentorId: String(r.mentor_id),
      status: str(r.status),
      startedAt: str(r.updated_at),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

mentorship.post('/register', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const skills = Array.isArray(body.skills) ? body.skills.map(String) : [];
  if (!skills.length) throw badRequest('List at least one skill you can mentor in.');

  const existing = await first<Row>(c.env.DB, 'SELECT id FROM mentor_profiles WHERE user_id = ?', user.id);
  if (existing) {
    await run(
      c.env.DB,
      `UPDATE mentor_profiles SET skills = ?, expertise = ?, years_experience = ?, bio = ?, availability = ?, languages = ?, hourly_rate = ?, active = 1 WHERE user_id = ?`,
      JSON.stringify(skills),
      String(body.expertise ?? ''),
      Number(body.yearsExperience ?? 0),
      String(body.bio ?? user.bio ?? ''),
      String(body.availability ?? 'weekends'),
      JSON.stringify(Array.isArray(body.languages) ? body.languages : ['English']),
      Number(body.hourlyRate ?? 0),
      user.id,
    );
    await run(c.env.DB, 'UPDATE users SET skills = ? WHERE id = ?', JSON.stringify(skills), user.id);
    const updated = await first<Row>(c.env.DB, 'SELECT * FROM mentor_profiles WHERE user_id = ?', user.id);
    return c.json({ message: 'Mentor profile updated.', mentor: await mentorProfileRow(c.env.DB, updated!) });
  }

  await run(
    c.env.DB,
    `INSERT INTO mentor_profiles (id, user_id, skills, expertise, years_experience, bio, availability, languages, hourly_rate, active, rating, sessions_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, datetime('now'))`,
    newId('mtr_'),
    user.id,
    JSON.stringify(skills),
    String(body.expertise ?? ''),
    Number(body.yearsExperience ?? 0),
    String(body.bio ?? user.bio ?? ''),
    String(body.availability ?? 'weekends'),
    JSON.stringify(Array.isArray(body.languages) ? body.languages : ['English']),
    Number(body.hourlyRate ?? 0),
  );
  await run(c.env.DB, 'UPDATE users SET skills = ? WHERE id = ?', JSON.stringify(skills), user.id);
  await logActivity(c.env, {
    userId: user.id,
    type: 'mentor_registered',
    targetType: 'mentor',
    message: `${user.fullName} joined as a mentor`,
  });
  const row = await first<Row>(c.env.DB, 'SELECT * FROM mentor_profiles WHERE user_id = ?', user.id);
  return c.json({ message: 'You are now a mentor. Thank you for giving back.', mentor: await mentorProfileRow(c.env.DB, row!) }, 201);
});

mentorship.post('/request', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const mentorId = String(body.mentorId ?? '');
  if (!mentorId) throw badRequest('mentorId is required.');
  if (mentorId === user.id) throw badRequest('You cannot mentor yourself.');

  const mentor = await first<Row>(c.env.DB, 'SELECT * FROM mentor_profiles WHERE user_id = ?', mentorId);
  if (!mentor) throw notFound('That mentor is no longer available.');

  const open = await first(
    c.env.DB,
    `SELECT id FROM mentorship_requests WHERE mentor_id = ? AND mentee_id = ? AND status IN ('pending','accepted')`,
    mentorId,
    user.id,
  );
  if (open) throw badRequest('You already have an open request with this mentor.');

  await run(
    c.env.DB,
    `INSERT INTO mentorship_requests (id, mentor_id, mentee_id, note, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
    newId('mreq_'),
    mentorId,
    user.id,
    String(body.note ?? '').slice(0, 1000),
  );
  await notify(c.env, {
    userId: mentorId,
    fromId: user.id,
    type: 'mentorship',
    message: `${user.fullName} would like you as a mentor`,
    link: `/digital-skills`,
  });
  return c.json({ message: 'Request sent. Your mentor will respond soon.' }, 201);
});

mentorship.get('/my', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    'SELECT * FROM mentorship_requests WHERE mentee_id = ? OR mentor_id = ? ORDER BY updated_at DESC LIMIT 50',
    user.id,
    user.id,
  );
  const map = await authorMap(c.env.DB, rows.flatMap((r) => [String(r.mentor_id), String(r.mentee_id)]));
  return c.json({
    requests: rows.map((r) => ({
      _id: String(r.id),
      mentor: map.get(String(r.mentor_id)),
      mentee: map.get(String(r.mentee_id)),
      note: str(r.note),
      status: str(r.status),
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
    })),
  });
});

mentorship.put('/requests/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM mentorship_requests WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Request not found.');
  if (String(row.mentor_id) !== user.id) throw forbidden('Only the mentor can respond to this request.');
  const status = String((await c.req.json().catch(() => ({}))).status ?? '');
  if (!['accepted', 'declined'].includes(status)) throw badRequest('Status must be accepted or declined.');
  await run(c.env.DB, `UPDATE mentorship_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`, status, String(row.id));
  if (status === 'accepted') {
    await run(c.env.DB, 'UPDATE mentor_profiles SET sessions_count = sessions_count + 1 WHERE user_id = ?', user.id);
  }
  await notify(c.env, {
    userId: String(row.mentee_id),
    fromId: user.id,
    type: 'mentorship',
    message: status === 'accepted' ? `${user.fullName} accepted your mentorship request!` : `${user.fullName} could not take on your request this time.`,
    link: `/digital-skills`,
  });
  return c.json({ message: `Request ${status}.`, status });
});

/* =========================== VOLUNTEER =========================== */

volunteer.get('/', async (c) => {
  const category = c.req.query('category');
  const where = [`status = 'open'`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM volunteer_opportunities WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 60`,
    ...params,
  );
  return c.json({
    opportunities: rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      title: str(r.title),
      description: str(r.description),
      organization: str(r.organization),
      category: str(r.category),
      location: str(r.location_name),
      commitment: str(r.commitment),
      spots: num(r.spots),
      filled: num(r.filled),
      startDate: r.start_date ? str(r.start_date) : null,
      status: str(r.status),
      createdAt: str(r.created_at),
    })),
  });
});

volunteer.post('/', async (c) => {
  requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw badRequest('Give the opportunity a title.');
  const id = newId('vol_');
  await run(
    c.env.DB,
    `INSERT INTO volunteer_opportunities (id, title, description, organization, category, location_name, commitment, spots, filled, start_date, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'open', datetime('now'))`,
    id,
    title,
    String(body.description ?? ''),
    String(body.organization ?? ''),
    String(body.category ?? 'community'),
    String(body.location ?? body.locationName ?? ''),
    String(body.commitment ?? 'flexible'),
    Number(body.spots ?? 0),
    body.startDate ? String(body.startDate) : null,
  );
  return c.json({ message: 'Volunteer opportunity posted.', opportunityId: id }, 201);
});

volunteer.post('/:id/apply', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM volunteer_opportunities WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Opportunity not found.');
  if (String(row.status) !== 'open') throw badRequest('This opportunity is closed.');
  const exists = await first(c.env.DB, 'SELECT id FROM volunteer_applications WHERE opportunity_id = ? AND user_id = ?', String(row.id), user.id);
  if (exists) throw badRequest('You have already signed up for this.');
  await run(
    c.env.DB,
    `INSERT INTO volunteer_applications (id, opportunity_id, user_id, motivation, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', datetime('now'))`,
    newId('vap_'),
    String(row.id),
    user.id,
    String((await c.req.json().catch(() => ({}))).motivation ?? '').slice(0, 1000),
  );
  await run(c.env.DB, 'UPDATE volunteer_opportunities SET filled = filled + 1 WHERE id = ?', String(row.id));
  return c.json({ message: 'Signed up! The organiser will confirm your slot.' }, 201);
});
