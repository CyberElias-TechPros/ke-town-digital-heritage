/**
 * Direct messaging + notification centre.
 * Conversations are derived-or-created: asking to message someone twice
 * returns the same thread instead of forking duplicates.
 */
import { Hono } from 'hono';
import { newId } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, forbidden, notFound } from '../lib/http';
import { requireAuth } from '../middleware';
import { authorMap, authorRef, loadUser, type Row } from '../lib/users';
import { notify } from '../lib/notify';
import { emit } from '../realtime';
import type { Env, AppEnv } from '../types';

export const conversations = new Hono<AppEnv>();
export const messages = new Hono<AppEnv>();
export const notifications = new Hono<AppEnv>();

function parseList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  try {
    const parsed = JSON.parse(String(raw ?? '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseObj<T extends object>(raw: unknown, fallback: T): T {
  try {
    const parsed = JSON.parse(String(raw ?? '{}'));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function conversationOrForbidden(db: D1Database, id: string, userId: string): Promise<Row> {
  const row = await first<Row>(db, 'SELECT * FROM conversations WHERE id = ?', id);
  if (!row) throw notFound('Conversation not found.');
  if (!parseList(row.participants).includes(userId)) throw forbidden('You are not part of this conversation.');
  return row;
}

async function serializeMessage(db: D1Database, row: Row): Promise<Row> {
  const sender = await authorRef(db, String(row.sender_id));
  return {
    _id: String(row.id),
    id: String(row.id),
    conversationId: String(row.conversation_id),
    sender,
    senderId: String(row.sender_id),
    content: String(row.content),
    media: parseList(row.media),
    readBy: parseList(row.read_by),
    readAt: row.read_at ? String(row.read_at) : undefined,
    replyTo: row.reply_to ? String(row.reply_to) : null,
    createdAt: String(row.created_at),
  };
}

async function serializeConversation(db: D1Database, row: Row, viewerId: string): Promise<Row> {
  const participants = parseList(row.participants);
  const map = await authorMap(db, participants);
  const unread = parseObj<Record<string, number>>(row.unread, {});
  const rows = await all<Row>(
    db,
    'SELECT * FROM messages WHERE conversation_id = ? AND ? NOT IN (SELECT value FROM json_each(read_by)) ORDER BY created_at DESC LIMIT 1',
    String(row.id),
    viewerId,
  );
  const lastMessage = rows[0] ? await serializeMessage(db, rows[0]) : null;
  return {
    _id: String(row.id),
    id: String(row.id),
    participants: participants.map((p) => map.get(p)).filter(Boolean),
    participantIds: participants,
    type: String(row.type),
    title: String(row.title),
    lastMessage: lastMessage,
    lastMessageAt: row.last_message_at ? String(row.last_message_at) : null,
    unreadCount: Number(unread[viewerId] ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ========================= CONVERSATIONS ========================= */

conversations.get('/', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM conversations WHERE participants LIKE ? ORDER BY COALESCE(last_message_at, updated_at) DESC LIMIT 100`,
    `%"${user.id}"%`,
  );
  return c.json(await Promise.all(rows.map((r) => serializeConversation(c.env.DB, r, user.id))));
});

conversations.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const participantId = String(body.participantId ?? '').trim();
  if (!participantId) throw badRequest('participantId is required.');
  if (participantId === user.id) throw badRequest('You cannot message yourself.');

  const target = await loadUser(c.env.DB, participantId);
  if (!target) throw notFound('That member no longer exists.');
  if (!target.allowMessages) throw forbidden(`${target.fullName} is not accepting messages right now.`);

  const existing = await all<Row>(
    c.env.DB,
    `SELECT * FROM conversations WHERE type = 'direct' AND participants LIKE ? AND participants LIKE ?`,
    `%"${user.id}"%`,
    `%"${participantId}"%`,
  );
  const match = existing.find((r) => parseList(r.participants).length === 2);
  if (match) return c.json(await serializeConversation(c.env.DB, match, user.id), 200);

  const id = newId('cnv_');
  await run(
    c.env.DB,
    `INSERT INTO conversations (id, participants, type, unread, created_at, updated_at)
     VALUES (?, ?, 'direct', '{}', datetime('now'), datetime('now'))`,
    id,
    JSON.stringify([user.id, participantId]),
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM conversations WHERE id = ?', id);
  await emit(c.env, 'conversation_created', { conversationId: id }, { userIds: [participantId] });
  return c.json(await serializeConversation(c.env.DB, row!, user.id), 201);
});

conversations.get('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await conversationOrForbidden(c.env.DB, c.req.param('id'), user.id);
  return c.json(await serializeConversation(c.env.DB, row, user.id));
});

conversations.get('/:id/messages', async (c) => {
  const user = await requireAuth(c);
  await conversationOrForbidden(c.env.DB, c.req.param('id'), user.id);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 50)));
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM messages
      WHERE conversation_id = ? AND ? NOT IN (SELECT value FROM json_each(deleted_for))
      ORDER BY created_at DESC LIMIT ?`,
    c.req.param('id'),
    user.id,
    limit,
  );
  const serialized = await Promise.all(rows.reverse().map((r) => serializeMessage(c.env.DB, r)));

  // Opening a thread marks the other side's messages as read.
  const unreadIds = rows.filter((r) => !parseList(r.read_by).includes(user.id)).map((r) => String(r.id));
  for (const messageId of unreadIds) {
    const row = rows.find((r) => String(r.id) === messageId)!;
    const readBy = Array.from(new Set([...parseList(row.read_by), user.id]));
    await run(
      c.env.DB,
      `UPDATE messages SET read_by = ?, read_at = COALESCE(read_at, datetime('now')) WHERE id = ?`,
      JSON.stringify(readBy),
      messageId,
    );
  }
  if (unreadIds.length) {
    const unread = parseObj<Record<string, number>>(
      (await first<Row>(c.env.DB, 'SELECT unread FROM conversations WHERE id = ?', c.req.param('id')))?.unread,
      {},
    );
    unread[user.id] = 0;
    await run(c.env.DB, `UPDATE conversations SET unread = ?, updated_at = datetime('now') WHERE id = ?`, JSON.stringify(unread), c.req.param('id'));
  }

  return c.json({ messages: serialized, total: serialized.length });
});

conversations.post('/:id/messages', async (c) => {
  const user = await requireAuth(c);
  const conversation = await conversationOrForbidden(c.env.DB, c.req.param('id'), user.id);
  const body = await c.req.json().catch(() => ({}));
  const content = String(body.content ?? '').trim();
  const media = Array.isArray(body.media) ? body.media.slice(0, 10) : [];
  if (!content && !media.length) throw badRequest('Message cannot be empty.');

  const id = newId('msg_');
  await run(
    c.env.DB,
    `INSERT INTO messages (id, conversation_id, sender_id, content, media, read_by, reply_to, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    String(conversation.id),
    user.id,
    content,
    JSON.stringify(media),
    JSON.stringify([user.id]),
    body.replyTo ? String(body.replyTo) : null,
  );

  const others = parseList(conversation.participants).filter((p) => p !== user.id);
  const unread = parseObj<Record<string, number>>(conversation.unread, {});
  for (const other of others) unread[other] = Number(unread[other] ?? 0) + 1;

  await run(
    c.env.DB,
    `UPDATE conversations SET last_message = ?, last_message_at = datetime('now'), unread = ?, updated_at = datetime('now') WHERE id = ?`,
    content.slice(0, 200),
    JSON.stringify(unread),
    String(conversation.id),
  );

  const row = await first<Row>(c.env.DB, 'SELECT * FROM messages WHERE id = ?', id);
  const message = await serializeMessage(c.env.DB, row!);

  for (const other of others) {
    await notify(c.env, {
      userId: other,
      fromId: user.id,
      type: 'message',
      message: `${user.fullName}: ${content.slice(0, 80) || 'sent an attachment'}`,
      link: `/messages/${conversation.id}`,
      data: { conversationId: String(conversation.id) },
    });
  }
  await emit(c.env, 'new_message', message, { userIds: others, room: `conversation:${conversation.id}` });
  return c.json(message, 201);
});

conversations.post('/:id/read', async (c) => {
  const user = await requireAuth(c);
  await conversationOrForbidden(c.env.DB, c.req.param('id'), user.id);
  const body = await c.req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.messageIds) ? body.messageIds.map(String) : [];

  if (ids.length) {
    for (const messageId of ids) {
      const row = await first<Row>(c.env.DB, 'SELECT read_by FROM messages WHERE id = ? AND conversation_id = ?', messageId, c.req.param('id'));
      if (!row) continue;
      const readBy = Array.from(new Set([...parseList(row.read_by), user.id]));
      await run(
        c.env.DB,
        `UPDATE messages SET read_by = ?, read_at = COALESCE(read_at, datetime('now')) WHERE id = ?`,
        JSON.stringify(readBy),
        messageId,
      );
    }
  } else {
    const pending = await all<Row>(
      c.env.DB,
      'SELECT id, read_by FROM messages WHERE conversation_id = ? AND sender_id <> ?',
      c.req.param('id'),
      user.id,
    );
    for (const row of pending) {
      const readBy = Array.from(new Set([...parseList(row.read_by), user.id]));
      await run(
        c.env.DB,
        `UPDATE messages SET read_by = ?, read_at = COALESCE(read_at, datetime('now')) WHERE id = ?`,
        JSON.stringify(readBy),
        String(row.id),
      );
    }
  }

  const unread = parseObj<Record<string, number>>(
    (await first<Row>(c.env.DB, 'SELECT unread FROM conversations WHERE id = ?', c.req.param('id')))?.unread,
    {},
  );
  unread[user.id] = 0;
  await run(c.env.DB, `UPDATE conversations SET unread = ?, updated_at = datetime('now') WHERE id = ?`, JSON.stringify(unread), c.req.param('id'));

  await emit(c.env, 'message_read', { conversationId: c.req.param('id'), readBy: user.id, messageIds: ids }, {
    room: `conversation:${c.req.param('id')}`,
  });
  return c.json({ message: 'Marked as read.', unreadCount: 0 });
});

conversations.post('/:id/typing', async (c) => {
  const user = await requireAuth(c);
  const conversation = await conversationOrForbidden(c.env.DB, c.req.param('id'), user.id);
  const isTyping = Boolean((await c.req.json().catch(() => ({}))).isTyping);
  const others = parseList(conversation.participants).filter((p) => p !== user.id);
  await emit(c.env, 'typing', { conversationId: String(conversation.id), userId: user.id, isTyping }, { userIds: others });
  return c.json({ ok: true });
});

conversations.delete('/:id/messages/:messageId', async (c) => {
  const user = await requireAuth(c);
  await conversationOrForbidden(c.env.DB, c.req.param('id'), user.id);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM messages WHERE id = ?', c.req.param('messageId'));
  if (!row) throw notFound('Message not found.');
  const deletedFor = Array.from(new Set([...parseList(row.deleted_for), user.id]));
  await run(c.env.DB, 'UPDATE messages SET deleted_for = ? WHERE id = ?', JSON.stringify(deletedFor), String(row.id));
  return c.json({ message: 'Message removed from your view.' });
});

/* =========================== MESSAGES =========================== */

messages.get('/unread/count', async (c) => {
  const user = await requireAuth(c);
  const row = await first<{ n: number }>(
    c.env.DB,
    `SELECT COUNT(*) AS n FROM messages m
      JOIN conversations cv ON cv.id = m.conversation_id
      WHERE cv.participants LIKE ?
        AND m.sender_id <> ?
        AND ? NOT IN (SELECT value FROM json_each(m.read_by))`,
    `%"${user.id}"%`,
    user.id,
    user.id,
  );
  return c.json({ count: Number(row?.n ?? 0) });
});

/* ======================== NOTIFICATIONS ======================== */

notifications.get('/', async (c) => {
  const user = await requireAuth(c);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 50)));
  const rows = await all<Row>(
    c.env.DB,
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    user.id,
    limit,
  );
  const map = await authorMap(c.env.DB, rows.map((r) => String(r.from_id ?? '')));
  return c.json(
    rows.map((r) => ({
      _id: String(r.id),
      id: String(r.id),
      type: String(r.type),
      title: String(r.title ?? ''),
      message: String(r.message),
      from: r.from_id ? map.get(String(r.from_id)) : undefined,
      link: r.link ? String(r.link) : undefined,
      data: parseObj(r.data, {}),
      read: r.read === 1,
      createdAt: String(r.created_at),
    })),
  );
});

notifications.get('/unread-count', async (c) => {
  const user = await requireAuth(c);
  const row = await first<{ n: number }>(
    c.env.DB,
    'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0',
    user.id,
  );
  return c.json({ count: Number(row?.n ?? 0) });
});

notifications.put('/:id/read', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', c.req.param('id'), user.id);
  const remaining = await count(
    c.env.DB,
    'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0',
    user.id,
  );
  return c.json({ message: 'Marked as read.', unreadCount: remaining });
});

notifications.post('/:id/read', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', c.req.param('id'), user.id);
  return c.json({ message: 'Marked as read.' });
});

notifications.post('/read-all', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', user.id);
  return c.json({ message: 'All notifications marked as read.' });
});

notifications.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM notifications WHERE id = ? AND user_id = ?', c.req.param('id'), user.id);
  return c.json({ message: 'Notification removed.' });
});

notifications.delete('/', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM notifications WHERE user_id = ?', user.id);
  return c.json({ message: 'Inbox cleared.' });
});

notifications.get('/preferences', async (c) => {
  const user = await requireAuth(c);
  const raw = await c.env.CACHE.get(`notif-prefs:${user.id}`);
  return c.json(
    raw
      ? JSON.parse(raw)
      : { email: true, push: true, likes: true, comments: true, follows: true, messages: true, orders: true, events: true },
  );
});

notifications.put('/preferences', async (c) => {
  const user = await requireAuth(c);
  const prefs = await c.req.json().catch(() => ({}));
  await c.env.CACHE.put(`notif-prefs:${user.id}`, JSON.stringify(prefs));
  return c.json({ message: 'Notification preferences saved.', preferences: prefs });
});

export { count };
