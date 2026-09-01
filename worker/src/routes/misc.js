// Misc routes: contact, newsletter, stories, analytics, health.
import {
  ok, badRequest, notFound, parseBody, queryParams,
} from "../lib/http.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, safeJson } from "../lib/middleware.js";

export async function handleMisc(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;
  const parts = path.split("/").filter(Boolean);
  const head = parts[0];

  switch (head) {
    case "health": return ok({ status: "ok", service: "ke-kingdom-cf-worker" });
    case "contact": return handleContact(request, env, parts, method);
    case "newsletter": return handleNewsletter(request, env, parts, method);
    case "stories": return handleStories(request, env, parts, method);
    case "analytics": return handleAnalytics(request, env, parts, method, url);
    default: return notFound(`No misc route for /api/${path}`);
  }
}

async function handleContact(request, env, parts, method) {
  if (parts.length === 1 && method === "POST") {
    const body = await parseBody(request);
    if (!body?.name || !body?.message) return badRequest("name and message are required");
    await run(env,
      "INSERT INTO contact_messages (id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      newId(), body.name, body.email || null, body.subject || null, body.message, now());
    return ok({ message: "Message received. We will get back to you soon." }, 201);
  }
  return notFound("No contact route");
}

async function handleNewsletter(request, env, parts, method) {
  if (parts.length === 1 && method === "POST") {
    const body = await parseBody(request);
    const email = String(body?.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("A valid email is required");
    await run(env, "INSERT OR IGNORE INTO newsletter_subscribers (id, email, created_at) VALUES (?, ?, ?)",
      newId(), email.toLowerCase(), now());
    return ok({ message: "Subscribed successfully" }, 201);
  }
  if (parts.length === 2 && method === "DELETE") {
    await run(env, "UPDATE newsletter_subscribers SET subscribed=0 WHERE email = ?", parts[1].toLowerCase());
    return ok({ message: "Unsubscribed" });
  }
  return notFound("No newsletter route");
}

async function handleStories(request, env, parts, method) {
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM elder_stories WHERE approved=1 ORDER BY created_at DESC LIMIT 100");
    return ok({ stories: rows.map((r) => ({ id: r.id, title: r.title, content: r.content, createdAt: r.created_at })) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.content) return badRequest("Story content is required");
    const id = newId();
    await run(env,
      "INSERT INTO elder_stories (id, author_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      id, user.id, body.title || "Story", body.content, now(), now());
    return ok({ story: { id, title: body.title || "Story" } }, 201);
  }
  return notFound("No stories route");
}

async function handleAnalytics(request, env, parts, method, url) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const qp = queryParams(url);
  const timeRange = qp.timeRange || "30d";

  if (parts.length === 2 && parts[1] === "overview" && method === "GET") {
    return ok({ overview: await computeOverview(env) });
  }
  if (parts.length === 1 && method === "GET") {
    return ok({ analytics: await computeOverview(env), timeRange });
  }
  if (parts.length === 2 && ["users", "content", "marketplace", "events", "cultural"].includes(parts[1])) {
    return ok({ analytics: await computeOverview(env), metric: parts[1], timeRange });
  }
  if (parts.length === 2 && parts[1] === "realtime") return ok({ realtime: await computeOverview(env) });
  if (parts.length === 2 && parts[1] === "export" && method === "GET") {
    const data = await computeOverview(env);
    if (qp.format === "csv") {
      const rows = [["metric", "value"], ...Object.entries(data)];
      const csv = rows.map((r) => r.join(",")).join("\n");
      return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=analytics.csv" } });
    }
    return ok(data);
  }
  if (parts.length === 2 && parts[1] === "custom" && method === "POST") {
    return ok({ analytics: await computeOverview(env) });
  }
  return notFound("No analytics route");
}

async function computeOverview(env) {
  const counts = {};
  const t = (sql, label) => first(env, sql).then((r) => (counts[label] = r ? r.c : 0));
  await Promise.all([
    t("SELECT COUNT(*) AS c FROM users", "users"),
    t("SELECT COUNT(*) AS c FROM posts", "posts"),
    t("SELECT COUNT(*) AS c FROM products", "products"),
    t("SELECT COUNT(*) AS c FROM events", "events"),
    t("SELECT COUNT(*) AS c FROM groups", "groups"),
    t("SELECT COUNT(*) AS c FROM comments", "comments"),
    t("SELECT COUNT(*) AS c FROM orders", "orders"),
    t("SELECT COUNT(*) AS c FROM gallery_items", "galleryItems"),
    t("SELECT COUNT(*) AS c FROM news", "news"),
  ]);
  const revenue = await first(env, "SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status != 'cancelled'");
  counts.revenue = revenue ? revenue.s : 0;
  return counts;
}
