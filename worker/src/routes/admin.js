// Admin routes: dashboard + moderation.
import {
  ok, badRequest, forbidden, notFound, parseBody, queryParams,
} from "../lib/http.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, safeJson, isAdmin, isModerator, isContentManager } from "../lib/middleware.js";

export async function handleAdmin(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api\/admin/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;
  const parts = path.split("/").filter(Boolean);

  const { user, error } = await requireUser(request, env);
  if (error) return error;
  if (!isAdmin(user) && !isModerator(user) && !isContentManager(user)) {
    return forbidden("Admin access required");
  }

  if (parts.length === 1 && parts[0] === "dashboard" && method === "GET") {
    return ok({ dashboard: await computeDashboard(env) });
  }

  if (parts.length === 1 && parts[0] === "events" && method === "GET") {
    const rows = await all(env, "SELECT * FROM events ORDER BY created_at DESC LIMIT 100");
    return ok({ events: rows.map((r) => ({ id: r.id, title: r.title, status: r.status, attendeeCount: r.attendee_count, createdAt: r.created_at })) });
  }

  if (parts.length === 1 && parts[0] === "news" && method === "GET") {
    const rows = await all(env, "SELECT * FROM news ORDER BY created_at DESC LIMIT 100");
    return ok({ news: rows.map((r) => ({ id: r.id, title: r.title, published: r.published, createdAt: r.created_at })) });
  }

  if (parts.length === 1 && parts[0] === "gallery" && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM gallery_items WHERE 1=1";
    const binds = [];
    if (qp.approved !== undefined) { sql += " AND approved = ?"; binds.push(qp.approved === "false" || qp.approved === "0" ? 0 : 1); }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const rows = await all(env, sql, ...binds);
    return ok({ items: rows.map((r) => ({ id: r.id, title: r.title, mediaUrl: r.media_url, approved: !!r.approved, authorId: r.author_id })) });
  }

  if (parts.length === 3 && parts[0] === "gallery" && parts[2] === "approve" && method === "POST") {
    await run(env, "UPDATE gallery_items SET approved=1, updated_at=? WHERE id=?", now(), parts[1]);
    return ok({ message: "Gallery item approved" });
  }

  if (parts.length === 1 && parts[0] === "directory" && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM directory_members WHERE 1=1";
    const binds = [];
    if (qp.approved !== undefined) { sql += " AND approved = ?"; binds.push(qp.approved === "false" || qp.approved === "0" ? 0 : 1); }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const rows = await all(env, sql, ...binds);
    return ok({ members: rows.map((r) => ({ id: r.id, fullName: r.full_name, business: r.business, approved: !!r.approved })) });
  }

  if (parts.length === 3 && parts[0] === "directory" && parts[2] === "approve" && method === "POST") {
    await run(env, "UPDATE directory_members SET approved=1, updated_at=? WHERE id=?", now(), parts[1]);
    return ok({ message: "Directory member approved" });
  }

  if (parts.length === 1 && parts[0] === "contacts" && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM contact_messages WHERE 1=1";
    const binds = [];
    if (qp.read !== undefined) { sql += " AND read = ?"; binds.push(qp.read === "true" || qp.read === "1" ? 1 : 0); }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const rows = await all(env, sql, ...binds);
    return ok({ messages: rows.map((r) => ({ id: r.id, name: r.name, email: r.email, subject: r.subject, message: r.message, read: !!r.read, createdAt: r.created_at })) });
  }

  if (parts.length === 3 && parts[0] === "contacts" && parts[2] === "read" && method === "POST") {
    await run(env, "UPDATE contact_messages SET read=1 WHERE id=?", parts[1]);
    return ok({ message: "Marked read" });
  }

  if (parts.length === 1 && parts[0] === "environment" && method === "GET") {
    const rows = await all(env, "SELECT * FROM environment_reports ORDER BY created_at DESC LIMIT 100");
    return ok({ reports: rows.map((r) => ({ id: r.id, title: r.title, status: r.status, createdAt: r.created_at })) });
  }

  if (parts.length === 1 && parts[0] === "projects" && method === "GET") {
    const rows = await all(env, "SELECT * FROM projects ORDER BY created_at DESC LIMIT 100");
    return ok({ projects: rows.map((r) => ({ id: r.id, title: r.title, status: r.status, createdAt: r.created_at })) });
  }

  if (parts.length === 3 && parts[0] === "projects" && parts[2] === "status" && method === "POST") {
    const body = await parseBody(request);
    await run(env, "UPDATE projects SET status=?, updated_at=? WHERE id=?", body?.status || "ongoing", now(), parts[1]);
    return ok({ message: "Project status updated" });
  }

  if (parts.length === 3 && parts[0] === "projects" && parts[2] === "updates" && method === "POST") {
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM projects WHERE id=?", parts[1]);
    if (!existing) return notFound("Project not found");
    const updates = safeJson(existing.updates, []);
    updates.push({ id: newId(), text: body?.text || "", createdAt: now() });
    await run(env, "UPDATE projects SET updates=?, updated_at=? WHERE id=?", JSON.stringify(updates), now(), parts[1]);
    return ok({ message: "Update added" });
  }

  return notFound("No admin route");
}

async function computeDashboard(env) {
  const counts = {};
  const t = (sql, label) => first(env, sql).then((r) => (counts[label] = r ? r.c : 0));
  await Promise.all([
    t("SELECT COUNT(*) AS c FROM users", "totalUsers"),
    t("SELECT COUNT(*) AS c FROM posts", "totalPosts"),
    t("SELECT COUNT(*) AS c FROM products", "totalProducts"),
    t("SELECT COUNT(*) AS c FROM events", "totalEvents"),
    t("SELECT COUNT(*) AS c FROM groups", "totalGroups"),
    t("SELECT COUNT(*) AS c FROM orders", "totalOrders"),
    t("SELECT COUNT(*) AS c FROM contact_messages", "unreadMessages"),
    t("SELECT COUNT(*) AS c FROM gallery_items WHERE approved=0", "pendingGallery"),
    t("SELECT COUNT(*) AS c FROM directory_members WHERE approved=0", "pendingDirectory"),
    t("SELECT COUNT(*) AS c FROM reports WHERE status='open'", "openReports"),
  ]);
  return counts;
}
