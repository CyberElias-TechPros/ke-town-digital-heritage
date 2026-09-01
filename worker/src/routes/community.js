// Community routes: groups, events, gallery, notifications, conversations/messages (REST), calendar.
import {
  ok, badRequest, unauthorized, forbidden, notFound, parseBody, queryParams,
} from "../lib/http.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, publicUser, minimalUser, safeJson } from "../lib/middleware.js";

export async function handleCommunity(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;
  const parts = path.split("/").filter(Boolean);
  const head = parts[0];

  switch (head) {
    case "groups": return handleGroups(request, env, parts, method);
    case "events": return handleEvents(request, env, parts, method);
    case "gallery": return handleGallery(request, env, parts, method);
    case "notifications": return handleNotifications(request, env, parts, method);
    case "conversations": return handleConversations(request, env, parts, method);
    case "messages": return handleMessagesRoot(request, env, parts, method);
    case "calendar": return handleCalendar(request, env, parts, method);
    case "polls": return handlePolls(request, env, parts, method);
    case "campaigns": return handleCampaigns(request, env, parts, method);
    case "petitions": return handlePetitions(request, env, parts, method);
    case "volunteer": return handleVolunteer(request, env, parts, method);
    default: return notFound(`No community route for /api/${path}`);
  }
}

// ------------------------------------------------------------
// GROUPS
// ------------------------------------------------------------
async function handleGroups(request, env, parts, method) {
  const url = new URL(request.url);
  if (parts.length === 1 && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM groups WHERE visibility='public'";
    const binds = [];
    if (qp.category) { sql += " AND category = ?"; binds.push(qp.category); }
    if (qp.search) { sql += " AND name LIKE ?"; binds.push(`%${qp.search}%`); }
    sql += " ORDER BY member_count DESC LIMIT 100";
    const rows = await all(env, sql, ...binds);
    return ok({ groups: rows.map(groupShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.name) return badRequest("Group name is required");
    const id = newId();
    const ts = now();
    await run(env,
      `INSERT INTO groups (id, creator_id, name, slug, description, category, avatar, cover_image, visibility, member_count, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      id, user.id, body.name, slugify(body.name, id), body.description || null, body.category || null,
      body.avatar || null, body.coverImage || null, body.privacy || "public",
      JSON.stringify(body.settings || {}), ts, ts
    );
    await run(env, "INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at) VALUES (?, ?, ?, 'admin', ?)",
      newId(), id, user.id, ts);
    const row = await first(env, "SELECT * FROM groups WHERE id = ?", id);
    return ok({ group: groupShape(row) }, 201);
  }
  if (parts.length === 2 && parts[1] === "mine" && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const rows = await all(env,
      `SELECT g.* FROM groups g JOIN group_members m ON m.group_id = g.id WHERE m.user_id = ? ORDER BY g.updated_at DESC`,
      user.id);
    return ok({ groups: rows.map(groupShape) });
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM groups WHERE id = ?", parts[1]);
    if (!row) return notFound("Group not found");
    return ok({ group: groupShape(row) });
  }
  if (parts.length === 3 && parts[2] === "join" && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    await run(env, "INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at) VALUES (?, ?, ?, 'member', ?)",
      newId(), parts[1], user.id, now());
    await run(env, "UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ?) WHERE id = ?",
      parts[1], parts[1]);
    return ok({ message: "Joined", status: "member" });
  }
  if (parts.length === 3 && parts[2] === "leave" && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    await run(env, "DELETE FROM group_members WHERE group_id = ? AND user_id = ?", parts[1], user.id);
    await run(env, "UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ?) WHERE id = ?",
      parts[1], parts[1]);
    return ok({ message: "Left" });
  }
  return notFound("No groups route");
}

function groupShape(row) {
  return {
    id: row.id, _id: row.id, name: row.name, slug: row.slug, description: row.description,
    category: row.category, avatar: row.avatar, coverImage: row.cover_image,
    visibility: row.visibility, memberCount: row.member_count, creatorId: row.creator_id,
    settings: safeJson(row.settings, {}), createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------
async function handleEvents(request, env, parts, method) {
  const url = new URL(request.url);
  if (parts.length === 1 && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM events WHERE status='published'";
    const binds = [];
    if (qp.category) { sql += " AND category = ?"; binds.push(qp.category); }
    sql += " ORDER BY start_date ASC LIMIT 200";
    const rows = await all(env, sql, ...binds);
    return ok({ events: rows.map(eventShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Event title is required");
    const id = newId();
    const ts = now();
    await run(env,
      `INSERT INTO events (id, creator_id, title, description, slug, category, event_type, start_date, end_date, timezone, location, venue, cover_image, capacity, visibility, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, user.id, body.title, body.description || null, slugify(body.title, id), body.category || null,
      body.eventType || "festival", body.startDate || body.start_date || null,
      body.endDate || body.end_date || null, body.timezone || null, body.location ? JSON.stringify(body.location) : null,
      body.venue || null, body.coverImage || body.cover_image || null, body.capacity || null,
      body.visibility || "public", ts, ts
    );
    const row = await first(env, "SELECT * FROM events WHERE id = ?", id);
    return ok({ event: eventShape(row) }, 201);
  }
  if (parts.length === 2 && parts[1] === "trending" && method === "GET") {
    const rows = await all(env,
      "SELECT * FROM events WHERE status='published' ORDER BY attendee_count DESC, start_date DESC LIMIT 6");
    return ok({ events: rows.map(eventShape) });
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM events WHERE id = ?", parts[1]);
    if (!row) return notFound("Event not found");
    return ok({ event: eventShape(row) });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const id = parts[1];
    const existing = await first(env, "SELECT * FROM events WHERE id = ?", id);
    if (!existing) return notFound("Event not found");
    if (existing.creator_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env,
      "UPDATE events SET title=?, description=?, category=?, start_date=?, end_date=?, location=?, cover_image=?, capacity=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.description ?? existing.description, body.category ?? existing.category,
      body.startDate ?? body.start_date ?? existing.start_date, body.endDate ?? existing.end_date,
      body.location ? JSON.stringify(body.location) : existing.location,
      body.coverImage ?? body.cover_image ?? existing.cover_image,
      body.capacity ?? existing.capacity, now(), id);
    const row = await first(env, "SELECT * FROM events WHERE id = ?", id);
    return ok({ event: eventShape(row) });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM events WHERE id = ?", parts[1]);
    if (!existing) return notFound("Event not found");
    if (existing.creator_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM events WHERE id = ?", parts[1]);
    return ok({ message: "Event deleted" });
  }
  if (parts.length === 3 && parts[2] === "rsvp" && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const event = await first(env, "SELECT id FROM events WHERE id = ?", parts[1]);
    if (!event) return notFound("Event not found");
    const body = await parseBody(request);
    const status = ["going", "interested", "declined"].includes(body?.status) ? body.status : "going";
    await run(env, "INSERT OR REPLACE INTO event_rsvps (id, event_id, user_id, status, created_at) VALUES (?, ?, ?, ?, ?)",
      newId(), parts[1], user.id, status, now());
    await run(env, "UPDATE events SET attendee_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id=? AND status IN ('going','interested')) WHERE id=?",
      parts[1], parts[1]);
    return ok({ message: "RSVP updated", status });
  }
  if (parts.length === 3 && parts[2] === "rsvp" && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    await run(env, "DELETE FROM event_rsvps WHERE event_id=? AND user_id=?", parts[1], user.id);
    await run(env, "UPDATE events SET attendee_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id=? AND status IN ('going','interested')) WHERE id=?",
      parts[1], parts[1]);
    return ok({ message: "RSVP removed" });
  }
  return notFound("No events route");
}

function eventShape(row) {
  return {
    id: row.id, _id: row.id, title: row.title, description: row.description, slug: row.slug,
    category: row.category, eventType: row.event_type, startDate: row.start_date, endDate: row.end_date,
    timezone: row.timezone, location: row.location ? safeJson(row.location, row.location) : null,
    venue: row.venue, coverImage: row.cover_image, capacity: row.capacity, status: row.status,
    visibility: row.visibility, attendeeCount: row.attendee_count, creatorId: row.creator_id,
    createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// GALLERY
// ------------------------------------------------------------
async function handleGallery(request, env, parts, method) {
  const url = new URL(request.url);
  if (parts.length === 1 && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM gallery_items WHERE approved=1 AND status='active'";
    const binds = [];
    if (qp.category) { sql += " AND category = ?"; binds.push(qp.category); }
    sql += " ORDER BY created_at DESC LIMIT 200";
    const rows = await all(env, sql, ...binds);
    return ok({ items: rows.map(galleryShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.mediaUrl && !body?.media) return badRequest("Media URL is required");
    const id = newId();
    await run(env,
      `INSERT INTO gallery_items (id, author_id, title, description, category, media_type, media_url, thumbnail, approved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, user.id, body.title || null, body.description || null, body.category || null,
      body.mediaType || "image", body.mediaUrl || body.media, body.thumbnail || null,
      ["admin", "moderator", "content_manager"].includes(user.role) ? 1 : 0, now(), now()
    );
    const row = await first(env, "SELECT * FROM gallery_items WHERE id = ?", id);
    return ok({ item: galleryShape(row) }, 201);
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM gallery_items WHERE id = ?", parts[1]);
    if (!row) return notFound("Gallery item not found");
    return ok({ item: galleryShape(row) });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM gallery_items WHERE id = ?", parts[1]);
    if (!existing) return notFound("Gallery item not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env,
      "UPDATE gallery_items SET title=?, description=?, category=?, media_type=?, media_url=?, thumbnail=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.description ?? existing.description, body.category ?? existing.category,
      body.mediaType ?? existing.media_type, body.mediaUrl ?? existing.media_url,
      body.thumbnail ?? existing.thumbnail, now(), parts[1]);
    const row = await first(env, "SELECT * FROM gallery_items WHERE id = ?", parts[1]);
    return ok({ item: galleryShape(row) });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM gallery_items WHERE id = ?", parts[1]);
    if (!existing) return notFound("Gallery item not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM gallery_items WHERE id = ?", parts[1]);
    return ok({ message: "Gallery item deleted" });
  }
  return notFound("No gallery route");
}

function galleryShape(row) {
  return {
    id: row.id, _id: row.id, title: row.title, description: row.description, category: row.category,
    mediaType: row.media_type, mediaUrl: row.media_url, thumbnail: row.thumbnail,
    approved: !!row.approved, featured: !!row.featured, likeCount: row.like_count,
    authorId: row.author_id, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------
async function handleNotifications(request, env, parts, method) {
  const url = new URL(request.url);
  if (parts.length === 1 && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const rows = await all(env,
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", user.id);
    return ok({ notifications: rows.map(notificationShape) });
  }
  if (parts.length === 1 && parts[0] === "notifications" && method === "POST" && false) {
    // no-op guard
  }
  // /notifications/read-all
  if (parts.length === 2 && parts[1] === "read-all" && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    await run(env, "UPDATE notifications SET read=1 WHERE user_id=?", user.id);
    return ok({ message: "All notifications marked read" });
  }
  // /notifications/unread-count
  if (parts.length === 2 && parts[1] === "unread-count" && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const row = await first(env, "SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND read=0", user.id);
    return ok({ count: row ? row.c : 0 });
  }
  // /notifications/:id/read
  if (parts.length === 3 && parts[2] === "read" && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    await run(env, "UPDATE notifications SET read=1 WHERE id=? AND user_id=?", parts[1], user.id);
    return ok({ message: "Marked read" });
  }
  return notFound("No notifications route");
}

function notificationShape(row) {
  return {
    id: row.id, type: row.type, title: row.title, body: row.body, link: row.link,
    metadata: safeJson(row.metadata, {}), read: !!row.read, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// CONVERSATIONS / MESSAGES (REST)
// ------------------------------------------------------------
async function handleConversations(request, env, parts, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;

  // POST /conversations { participantId }
  if (parts.length === 1 && method === "POST") {
    const body = await parseBody(request);
    const participantId = body?.participantId;
    if (!participantId) return badRequest("participantId is required");
    // find existing conversation
    const existing = await findConversation(env, user.id, participantId);
    if (existing) return ok({ conversation: convShape(existing, user.id) });
    const id = newId();
    const ts = now();
    const participants = await buildParticipants(env, user.id, participantId);
    await run(env,
      "INSERT INTO conversations (id, participants, participant_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      id, JSON.stringify(participants), JSON.stringify([user.id, participantId]), ts, ts);
    const row = await first(env, "SELECT * FROM conversations WHERE id = ?", id);
    return ok({ conversation: convShape(row, user.id) }, 201);
  }

  // GET /conversations
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 100");
    const mine = rows.filter((r) => safeJson(r.participant_ids).includes(user.id));
    return ok({ conversations: mine.map((r) => convShape(r, user.id)) });
  }

  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM conversations WHERE id = ?", parts[1]);
    if (!row) return notFound("Conversation not found");
    return ok({ conversation: convShape(row, user.id) });
  }

  // POST /conversations/:id/messages
  if (parts.length === 3 && parts[2] === "messages" && method === "POST") {
    const body = await parseBody(request);
    const content = (body?.content || "").toString().trim();
    if (!content) return badRequest("Message content is required");
    const conv = await first(env, "SELECT * FROM conversations WHERE id = ?", parts[1]);
    if (!conv) return notFound("Conversation not found");
    const msgId = newId();
    const ts = now();
    await run(env,
      "INSERT INTO messages (id, conversation_id, sender_id, sender_name, sender_avatar, content, media, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      msgId, parts[1], user.id, user.full_name, user.avatar, content, JSON.stringify(body?.media || []), ts);
    await run(env, "UPDATE conversations SET last_message = ?, updated_at = ? WHERE id = ?", JSON.stringify({ content, createdAt: ts }), ts, parts[1]);
    return ok({ message: {
      id: msgId, _id: msgId, conversationId: parts[1], content, media: body?.media || [],
      sender: { _id: user.id, fullName: user.full_name, avatar: user.avatar },
      createdAt: ts,
    } }, 201);
  }

  // GET /conversations/:id/messages
  if (parts.length === 3 && parts[2] === "messages" && method === "GET") {
    const rows = await all(env,
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 500", parts[1]);
    const out = rows.map((r) => ({
      id: r.id, _id: r.id, conversationId: r.conversation_id, content: r.content,
      media: safeJson(r.media, []), sender: { _id: r.sender_id, fullName: r.sender_name, avatar: r.sender_avatar },
      createdAt: r.created_at, readAt: r.read_at,
    }));
    return ok({ messages: out });
  }

  // POST /conversations/:id/read
  if (parts.length === 3 && parts[2] === "read" && method === "POST") {
    await run(env, "UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ?", now(), parts[1], user.id);
    return ok({ message: "Marked read" });
  }

  // POST /conversations/:id/typing
  if (parts.length === 3 && parts[2] === "typing" && method === "POST") {
    return ok({ message: "typing" });
  }

  // DELETE /conversations/:id/messages/:messageId
  if (parts.length === 4 && parts[2] === "messages" && method === "DELETE") {
    await run(env, "DELETE FROM messages WHERE id = ? AND conversation_id = ? AND sender_id = ?", parts[3], parts[1], user.id);
    return ok({ message: "Message deleted" });
  }

  return notFound("No conversation route");
}

async function handleMessagesRoot(request, env, parts, method) {
  // GET /messages/unread/count
  if (parts.length === 3 && parts[1] === "unread" && parts[2] === "count" && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    return ok({ count: 0 });
  }
  return notFound("No messages route");
}

async function findConversation(env, a, b) {
  const rows = await all(env, "SELECT * FROM conversations");
  for (const r of rows) {
    const ids = safeJson(r.participant_ids);
    if (ids.includes(a) && ids.includes(b)) return r;
  }
  return null;
}

async function buildParticipants(env, a, b) {
  const users = await all(env, "SELECT * FROM users WHERE id IN (?, ?)", a, b);
  const map = {};
  users.forEach((u) => (map[u.id] = u));
  return [map[a], map[b]].filter(Boolean).map((u) => ({
    _id: u.id, fullName: u.full_name, avatar: u.avatar, isSeller: !!u.is_seller, shopName: u.shop_name,
  }));
}

function convShape(row, viewerId) {
  const participants = safeJson(row.participants, []);
  const unread = safeJson(row.unread_count, {});
  return {
    id: row.id, _id: row.id, participants,
    participantIds: safeJson(row.participant_ids, []),
    lastMessage: safeJson(row.last_message, null),
    unreadCount: unread[viewerId] || 0,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

// ------------------------------------------------------------
// CALENDAR
// ------------------------------------------------------------
async function handleCalendar(request, env, parts, method) {
  const url = new URL(request.url);
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM events WHERE status='published' ORDER BY start_date ASC LIMIT 200");
    return ok({ events: rows.map(eventShape) });
  }
  if (parts.length === 2 && parts[1] === "upcoming" && method === "GET") {
    const qp = queryParams(url);
    const limit = parseInt(qp.limit) || 5;
    const rows = await all(env,
      "SELECT * FROM events WHERE status='published' ORDER BY start_date ASC LIMIT ?", limit);
    return ok({ events: rows.map(eventShape) });
  }
  if (parts.length === 2 && parts[1] === "best-time-to-visit" && method === "GET") {
    return ok({ recommendation: { message: "Visit during the dry season (November to February) for festivals.", bestMonths: [11, 12, 1, 2] } });
  }
  if (parts.length === 2 && parts[1] === "festivals" && method === "GET") {
    const rows = await all(env, "SELECT * FROM events WHERE status='published' AND event_type='festival' ORDER BY start_date ASC LIMIT 200");
    return ok({ events: rows.map(eventShape) });
  }
  return notFound("No calendar route");
}

// ------------------------------------------------------------
// POLLS / CAMPAIGNS / PETITIONS / VOLUNTEER (basic)
// ------------------------------------------------------------
async function handlePolls(request, env, parts, method) {
  if (method === "GET") return ok({ polls: [] });
  if (method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    return ok({ poll: { id: newId(), question: body?.question, options: body?.options || [] } }, 201);
  }
  return notFound("No polls route");
}

async function handleCampaigns(request, env, parts, method) {
  if (method === "GET") return ok({ campaigns: [] });
  if (method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    return ok({ campaign: { id: newId(), title: body?.title } }, 201);
  }
  return notFound("No campaigns route");
}

async function handlePetitions(request, env, parts, method) {
  if (method === "GET") return ok({ petitions: [] });
  if (method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    return ok({ petition: { id: newId(), title: body?.title } }, 201);
  }
  return notFound("No petitions route");
}

async function handleVolunteer(request, env, parts, method) {
  if (method === "GET") return ok({ opportunities: [] });
  if (method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    return ok({ opportunity: { id: newId(), title: body?.title } }, 201);
  }
  return notFound("No volunteer route");
}

function slugify(text, fallback) {
  const s = String(text || "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || fallback.slice(0, 8);
}
