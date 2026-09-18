/**
 * Community groups + events.
 * Join rules honour `joinMethod`: open groups join instantly, approval
 * groups park the request in `pending` and notify the moderators.
 */
import { Hono } from 'hono';
import { newId } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, clampInt, forbidden, notFound, slugify } from '../lib/http';
import { isStaff, requireAuth } from '../middleware';
import { authorMap, authorRef, loadUser, serializeEvent, serializeGroup, serializePost, type Row } from '../lib/users';
import { logActivity, notify, notifyMany } from '../lib/notify';
import { emit } from '../realtime';
import type { Env, AppEnv } from '../types';

export const groups = new Hono<AppEnv>();
export const events = new Hono<AppEnv>();

async function groupOr404(db: D1Database, id: string): Promise<Row> {
  const row = await first<Row>(db, 'SELECT * FROM groups WHERE id = ? AND status = ?', id, 'active');
  if (!row) throw notFound('That group does not exist.');
  return row;
}

async function moderators(db: D1Database, groupId: string): Promise<string[]> {
  const rows = await all<{ user_id: string }>(
    db,
    `SELECT user_id FROM group_members WHERE group_id = ? AND role IN ('owner','admin','moderator') AND status = 'active'`,
    groupId,
  );
  return rows.map((r) => r.user_id);
}

/* ============================== GROUPS ============================== */

groups.get('/my', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT g.* FROM groups g
       JOIN group_members m ON m.group_id = g.id
      WHERE m.user_id = ? AND m.status = 'active' AND g.status = 'active'
      ORDER BY g.name ASC`,
    user.id,
  );
  return c.json(await Promise.all(rows.map((r) => serializeGroup(c.env.DB, r, user.id))));
});

groups.get('/', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category');
  const search = c.req.query('search') || c.req.query('q');
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 24, 1, 100);

  const where = [`status = 'active'`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (search) {
    where.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const clause = where.join(' AND ');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM groups WHERE ${clause} ORDER BY member_count DESC, created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );
  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM groups WHERE ${clause}`, ...params);
  return c.json({
    groups: await Promise.all(rows.map((r) => serializeGroup(c.env.DB, r, user?.id ?? null))),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

groups.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (name.length < 3) throw badRequest('Group name must be at least 3 characters.');
  if (name.length > 80) throw badRequest('Group name must be under 80 characters.');

  const privacy = ['public', 'private', 'secret'].includes(String(body.privacy)) ? String(body.privacy) : 'public';
  const joinMethod = ['open', 'approval', 'invite'].includes(String(body.joinMethod)) ? String(body.joinMethod) : 'open';

  const id = newId('grp_');
  await run(
    c.env.DB,
    `INSERT INTO groups (id, name, slug, description, cover_image, avatar, privacy, category, join_method, creator_id, member_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    id,
    name,
    slugify(name) || id,
    String(body.description ?? '').slice(0, 2000),
    String(body.coverImage ?? ''),
    String(body.avatar ?? ''),
    privacy,
    String(body.category ?? 'general'),
    joinMethod,
    user.id,
  );
  await run(
    c.env.DB,
    `INSERT INTO group_members (group_id, user_id, role, status, created_at) VALUES (?, ?, 'owner', 'active', datetime('now'))`,
    id,
    user.id,
  );
  await logActivity(c.env, {
    userId: user.id,
    type: 'group_created',
    targetType: 'group',
    targetId: id,
    message: `${user.fullName} created the group ${name}`,
  });

  const row = await groupOr404(c.env.DB, id);
  return c.json(await serializeGroup(c.env.DB, row, user.id), 201);
});

groups.get('/categories', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    `SELECT category, COUNT(*) AS n FROM groups WHERE status = 'active' GROUP BY category ORDER BY n DESC`,
  );
  return c.json(rows.map((r) => ({ id: String(r.category), label: String(r.category), count: Number(r.n) })));
});

groups.get('/:id', async (c) => {
  const user = c.get('user');
  const row = await groupOr404(c.env.DB, c.req.param('id'));
  if (String(row.privacy) === 'secret' && !user) throw forbidden('This group is private.');
  return c.json(await serializeGroup(c.env.DB, row, user?.id ?? null));
});

groups.put('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await groupOr404(c.env.DB, c.req.param('id'));
  const mods = await moderators(c.env.DB, String(row.id));
  if (!mods.includes(user.id) && !isStaff(user)) throw forbidden('Only group moderators can edit this group.');

  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries({
    name: 'name',
    description: 'description',
    coverImage: 'cover_image',
    avatar: 'avatar',
    privacy: 'privacy',
    category: 'category',
    joinMethod: 'join_method',
  })) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(String(body[key]));
    }
  }
  if (!sets.length) return c.json(await serializeGroup(c.env.DB, row, user.id));
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE groups SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  return c.json(await serializeGroup(c.env.DB, await groupOr404(c.env.DB, String(row.id)), user.id));
});

groups.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await groupOr404(c.env.DB, c.req.param('id'));
  if (String(row.creator_id) !== user.id && !isStaff(user)) throw forbidden('Only the group owner can delete it.');
  await run(c.env.DB, `UPDATE groups SET status = 'archived', updated_at = datetime('now') WHERE id = ?`, String(row.id));
  return c.json({ message: 'Group archived.' });
});

groups.post('/:id/join', async (c) => {
  const user = await requireAuth(c);
  const row = await groupOr404(c.env.DB, c.req.param('id'));
  const groupId = String(row.id);

  const existing = await first<Row>(
    c.env.DB,
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
    groupId,
    user.id,
  );
  if (existing && String(existing.status) === 'active') {
    return c.json({ message: 'You are already a member.', status: 'joined' });
  }
  if (existing && String(existing.status) === 'pending') {
    return c.json({ message: 'Your request is awaiting approval.', status: 'pending' });
  }

  const needsApproval = String(row.join_method) === 'approval' || String(row.privacy) === 'private';
  const status = needsApproval ? 'pending' : 'active';

  if (existing) {
    await run(
      c.env.DB,
      `UPDATE group_members SET status = ?, created_at = datetime('now') WHERE group_id = ? AND user_id = ?`,
      status,
      groupId,
      user.id,
    );
  } else {
    await run(
      c.env.DB,
      `INSERT INTO group_members (group_id, user_id, role, status, created_at) VALUES (?, ?, 'member', ?, datetime('now'))`,
      groupId,
      user.id,
      status,
    );
  }

  if (status === 'active') {
    await run(c.env.DB, 'UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND status = ?) WHERE id = ?', groupId, 'active', groupId);
    await logActivity(c.env, {
      userId: user.id,
      type: 'group_joined',
      targetType: 'group',
      targetId: groupId,
      message: `${user.fullName} joined ${String(row.name)}`,
    });
    await notifyMany(c.env, await moderators(c.env.DB, groupId), {
      fromId: user.id,
      type: 'group_member',
      message: `${user.fullName} joined ${String(row.name)}`,
      link: `/groups/${groupId}`,
    });
    await emit(c.env, 'group_update', { groupId, userId: user.id, status: 'joined' }, { room: `group:${groupId}` });
    return c.json({ message: `Welcome to ${String(row.name)}!`, status: 'joined' });
  }

  await notifyMany(c.env, await moderators(c.env.DB, groupId), {
    fromId: user.id,
    type: 'group_request',
    message: `${user.fullName} requested to join ${String(row.name)}`,
    link: `/groups/${groupId}`,
  });
  return c.json({ message: 'Request sent. A moderator will review it shortly.', status: 'pending' });
});

groups.post('/:id/leave', async (c) => {
  const user = await requireAuth(c);
  const row = await groupOr404(c.env.DB, c.req.param('id'));
  const groupId = String(row.id);
  if (String(row.creator_id) === user.id) {
    throw badRequest('Owners cannot leave their own group. Transfer ownership or archive it instead.');
  }
  await run(c.env.DB, 'DELETE FROM group_members WHERE group_id = ? AND user_id = ?', groupId, user.id);
  await run(c.env.DB, 'UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND status = ?) WHERE id = ?', groupId, 'active', groupId);
  return c.json({ message: `You left ${String(row.name)}.`, status: 'left' });
});

groups.get('/:id/members', async (c) => {
  const groupId = c.req.param('id');
  await groupOr404(c.env.DB, groupId);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT user_id, role, status, created_at FROM group_members WHERE group_id = ? ORDER BY status ASC, created_at ASC`,
    groupId,
  );
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.user_id)));
  return c.json(
    rows.map((r) => ({
      ...map.get(String(r.user_id)),
      role: String(r.role),
      status: String(r.status),
      joinedAt: String(r.created_at),
    })),
  );
});

groups.get('/:id/requests', async (c) => {
  const user = await requireAuth(c);
  const groupId = c.req.param('id');
  const mods = await moderators(c.env.DB, groupId);
  if (!mods.includes(user.id) && !isStaff(user)) throw forbidden('Only moderators can see join requests.');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM group_members WHERE group_id = ? AND status = 'pending' ORDER BY created_at DESC`,
    groupId,
  );
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.user_id)));
  return c.json(rows.map((r) => ({ ...map.get(String(r.user_id)), requestedAt: String(r.created_at) })));
});

groups.post('/:id/requests/:userId/approve', async (c) => {
  const user = await requireAuth(c);
  const groupId = c.req.param('id');
  const mods = await moderators(c.env.DB, groupId);
  if (!mods.includes(user.id) && !isStaff(user)) throw forbidden('Only moderators can approve requests.');
  await run(
    c.env.DB,
    `UPDATE group_members SET status = 'active' WHERE group_id = ? AND user_id = ?`,
    groupId,
    c.req.param('userId'),
  );
  await run(c.env.DB, 'UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND status = ?) WHERE id = ?', groupId, 'active', groupId);
  await notify(c.env, {
    userId: c.req.param('userId'),
    fromId: user.id,
    type: 'group_request_approved',
    message: `Your request to join was approved`,
    link: `/groups/${groupId}`,
  });
  return c.json({ message: 'Request approved.' });
});

groups.post('/:id/requests/:userId/reject', async (c) => {
  const user = await requireAuth(c);
  const groupId = c.req.param('id');
  const mods = await moderators(c.env.DB, groupId);
  if (!mods.includes(user.id) && !isStaff(user)) throw forbidden('Only moderators can decline requests.');
  await run(c.env.DB, `DELETE FROM group_members WHERE group_id = ? AND user_id = ?`, groupId, c.req.param('userId'));
  await notify(c.env, {
    userId: c.req.param('userId'),
    fromId: user.id,
    type: 'group_request_rejected',
    message: 'Your join request was not approved this time.',
    link: `/groups/${groupId}`,
  });
  return c.json({ message: 'Request declined.' });
});

groups.get('/:id/posts', async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts WHERE group_id = ? AND status = 'active' ORDER BY is_pinned DESC, created_at DESC LIMIT 50`,
    groupId,
  );
  return c.json(await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user?.id ?? null))));
});

/* ============================== EVENTS ============================== */

async function eventOr404(db: D1Database, id: string): Promise<Row> {
  const row = await first<Row>(db, 'SELECT * FROM events WHERE id = ?', id);
  if (!row) throw notFound('That event no longer exists.');
  return row;
}

events.get('/trending', async (c) => {
  const user = c.get('user');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM events WHERE status = 'approved' AND start_date >= datetime('now')
      ORDER BY rsvp_count DESC, start_date ASC LIMIT 8`,
  );
  return c.json(await Promise.all(rows.map((r) => serializeEvent(c.env.DB, r, user?.id ?? null))));
});

events.get('/', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category');
  const upcomingOnly = c.req.query('upcoming') !== 'false';
  const search = c.req.query('search');

  const where = [`status = 'approved'`];
  const params: (string | number)[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (upcomingOnly) where.push(`start_date >= datetime('now')`);
  if (search) {
    where.push('(title LIKE ? OR description LIKE ? OR location_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const clause = where.join(' AND ');
  const rows = await all<Row>(c.env.DB, `SELECT * FROM events WHERE ${clause} ORDER BY start_date ASC LIMIT 60`, ...params);
  return c.json({
    events: await Promise.all(rows.map((r) => serializeEvent(c.env.DB, r, user?.id ?? null))),
    total: rows.length,
  });
});

events.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw badRequest('Event title must be at least 3 characters.');
  const startDate = String(body.startDate ?? '').trim();
  if (!startDate) throw badRequest('A start date is required.');
  if (Number.isNaN(Date.parse(startDate))) throw badRequest('That start date is not valid.');

  const id = newId('evt_');
  await run(
    c.env.DB,
    `INSERT INTO events (id, title, description, cover_image, category, event_type, location_name, address, latitude, longitude,
                         online_link, start_date, end_date, timezone, organizer_id, group_id, capacity, price, currency, tags, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id,
    title,
    String(body.description ?? '').slice(0, 5000),
    String(body.coverImage ?? ''),
    String(body.category ?? 'community'),
    String(body.eventType ?? body.type ?? 'in_person'),
    String(body.location?.name ?? body.locationName ?? ''),
    String(body.location?.address ?? body.address ?? ''),
    body.location?.latitude ?? body.latitude ?? null,
    body.location?.longitude ?? body.longitude ?? null,
    String(body.onlineLink ?? ''),
    new Date(startDate).toISOString(),
    body.endDate ? new Date(String(body.endDate)).toISOString() : null,
    String(body.timezone ?? 'Africa/Lagos'),
    user.id,
    body.groupId ? String(body.groupId) : null,
    Number(body.capacity ?? 0),
    Number(body.price ?? 0),
    String(body.currency ?? 'NGN'),
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    isStaff(user) ? 'approved' : 'approved',
  );

  await logActivity(c.env, {
    userId: user.id,
    type: 'event_created',
    targetType: 'event',
    targetId: id,
    message: `${user.fullName} created the event ${title}`,
  });
  if (body.groupId) {
    const members = await all<{ user_id: string }>(
      c.env.DB,
      `SELECT user_id FROM group_members WHERE group_id = ? AND status = 'active' AND user_id <> ?`,
      String(body.groupId),
      user.id,
    );
    await notifyMany(c.env, members.map((m) => m.user_id), {
      fromId: user.id,
      type: 'event',
      message: `New event in your group: ${title}`,
      link: `/events/${id}`,
    });
  }
  await emit(c.env, 'event_update', { eventId: id, action: 'created' }, { room: 'broadcast' });

  return c.json(await serializeEvent(c.env.DB, await eventOr404(c.env.DB, id), user.id), 201);
});

events.get('/:id', async (c) => {
  const user = c.get('user');
  const row = await eventOr404(c.env.DB, c.req.param('id'));
  await run(c.env.DB, 'UPDATE events SET view_count = view_count + 1 WHERE id = ?', String(row.id));
  return c.json(await serializeEvent(c.env.DB, row, user?.id ?? null));
});

events.put('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await eventOr404(c.env.DB, c.req.param('id'));
  if (String(row.organizer_id) !== user.id && !isStaff(user)) throw forbidden('Only the organiser can edit this event.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (body.title !== undefined) {
    sets.push('title = ?');
    params.push(String(body.title));
  }
  if (body.description !== undefined) {
    sets.push('description = ?');
    params.push(String(body.description));
  }
  if (body.coverImage !== undefined) {
    sets.push('cover_image = ?');
    params.push(String(body.coverImage));
  }
  if (body.category !== undefined) {
    sets.push('category = ?');
    params.push(String(body.category));
  }
  if (body.startDate !== undefined) {
    sets.push('start_date = ?');
    params.push(new Date(String(body.startDate)).toISOString());
  }
  if (body.endDate !== undefined) {
    sets.push('end_date = ?');
    params.push(new Date(String(body.endDate)).toISOString());
  }
  if (body.locationName !== undefined) {
    sets.push('location_name = ?');
    params.push(String(body.locationName));
  }
  if (body.capacity !== undefined) {
    sets.push('capacity = ?');
    params.push(Number(body.capacity));
  }
  if (body.price !== undefined) {
    sets.push('price = ?');
    params.push(Number(body.price));
  }
  if (body.status !== undefined && isStaff(user)) {
    sets.push('status = ?');
    params.push(String(body.status));
  }
  if (!sets.length) return c.json(await serializeEvent(c.env.DB, row, user.id));
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE events SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  const updated = await eventOr404(c.env.DB, String(row.id));
  const rsvpUsers = await all<{ user_id: string }>(c.env.DB, 'SELECT user_id FROM event_rsvps WHERE event_id = ?', String(row.id));
  await notifyMany(c.env, rsvpUsers.map((r) => r.user_id), {
    fromId: user.id,
    type: 'event',
    message: `“${String(updated.title)}” details were updated`,
    link: `/events/${String(row.id)}`,
  });
  await emit(c.env, 'event_update', { eventId: String(row.id), action: 'updated' }, { room: 'broadcast' });
  return c.json(await serializeEvent(c.env.DB, updated, user.id));
});

events.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await eventOr404(c.env.DB, c.req.param('id'));
  if (String(row.organizer_id) !== user.id && !isStaff(user)) throw forbidden('Only the organiser can cancel this event.');
  const attendees = await all<{ user_id: string }>(c.env.DB, 'SELECT user_id FROM event_rsvps WHERE event_id = ?', String(row.id));
  await run(c.env.DB, `UPDATE events SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, String(row.id));
  await notifyMany(c.env, attendees.map((r) => r.user_id), {
    fromId: user.id,
    type: 'event',
    message: `“${String(row.title)}” has been cancelled`,
    link: `/events/${String(row.id)}`,
  });
  return c.json({ message: 'Event cancelled and attendees notified.' });
});

events.post('/:id/rsvp', async (c) => {
  const user = await requireAuth(c);
  const row = await eventOr404(c.env.DB, c.req.param('id'));
  const eventId = String(row.id);
  const requested = String((await c.req.json().catch(() => ({}))).status ?? 'going');
  const status = ['going', 'interested', 'declined'].includes(requested) ? requested : 'going';

  const capacity = Number(row.capacity ?? 0);
  if (status === 'going' && capacity > 0) {
    const going = await count(c.env.DB, `SELECT COUNT(*) AS n FROM event_rsvps WHERE event_id = ? AND status = 'going'`, eventId);
    const already = await first(c.env.DB, 'SELECT 1 AS x FROM event_rsvps WHERE event_id = ? AND user_id = ? AND status = ?', eventId, user.id, 'going');
    if (!already && going >= capacity) throw badRequest('This event is fully booked. Join the waiting list by choosing “Interested”.');
  }

  await run(
    c.env.DB,
    `INSERT INTO event_rsvps (event_id, user_id, status, created_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status`,
    eventId,
    user.id,
    status,
  );
  await run(
    c.env.DB,
    'UPDATE events SET rsvp_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = ? AND status <> ?) WHERE id = ?',
    eventId,
    'declined',
    eventId,
  );

  if (status !== 'declined' && String(row.organizer_id) !== user.id) {
    await notify(c.env, {
      userId: String(row.organizer_id),
      fromId: user.id,
      type: 'event_rsvp',
      message: `${user.fullName} is ${status === 'going' ? 'attending' : 'interested in'} “${String(row.title)}”`,
      link: `/events/${eventId}`,
    });
  }
  await logActivity(c.env, {
    userId: user.id,
    type: 'event_rsvp',
    targetType: 'event',
    targetId: eventId,
    message: `${user.fullName} RSVP’d ${status} to ${String(row.title)}`,
  });
  await emit(c.env, 'new_rsvp', { eventId, userId: user.id, status }, { room: 'broadcast' });

  return c.json({
    message:
      status === 'going'
        ? `You're going to “${String(row.title)}”. See you there!`
        : status === 'interested'
          ? `Saved “${String(row.title)}” to your interests.`
          : 'RSVP removed.',
    status,
    event: await serializeEvent(c.env.DB, await eventOr404(c.env.DB, eventId), user.id),
  });
});

events.delete('/:id/rsvp', async (c) => {
  const user = await requireAuth(c);
  const eventId = c.req.param('id');
  await eventOr404(c.env.DB, eventId);
  await run(c.env.DB, 'DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?', eventId, user.id);
  await run(
    c.env.DB,
    'UPDATE events SET rsvp_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = ? AND status <> ?) WHERE id = ?',
    eventId,
    'declined',
    eventId,
  );
  return c.json({ message: 'RSVP cancelled.', status: null, event: await serializeEvent(c.env.DB, await eventOr404(c.env.DB, eventId), user.id) });
});

events.get('/:id/attendees', async (c) => {
  const eventId = c.req.param('id');
  await eventOr404(c.env.DB, eventId);
  const rows = await all<Row>(c.env.DB, 'SELECT user_id, status FROM event_rsvps WHERE event_id = ?', eventId);
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.user_id)));
  return c.json(rows.map((r) => ({ ...map.get(String(r.user_id)), status: String(r.status) })));
});

export { authorRef };
