// Unified search across users, posts, products, events, groups, news, gallery.
import { ok, queryParams } from "../lib/http.js";
import { all } from "../lib/db.js";
import { minimalUser, safeJson } from "../lib/middleware.js";

export async function handleSearch(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean); // ["api","search",...]
  const qp = queryParams(request.url);
  const q = (qp.q || qp.query || "").toString().trim();
  const type = (qp.type || "all").toString();

  if (parts[1] === "suggestions") {
    if (!q) return ok({ suggestions: [] });
    return ok({ suggestions: await getSuggestions(env, q) });
  }

  if (!q) return ok({ results: [], total: 0 });

  const results = {};
  const like = `%${q}%`;
  const limit = Math.min(parseInt(qp.limit) || 10, 50);

  if (type === "all" || type === "users") {
    const users = await all(env,
      "SELECT * FROM users WHERE account_status='active' AND (full_name LIKE ? OR username LIKE ? OR email LIKE ?) LIMIT ?",
      like, like, like, limit);
    results.users = users.map(minimalUser);
  }
  if (type === "all" || type === "posts") {
    const posts = await all(env,
      "SELECT * FROM posts WHERE status='active' AND content LIKE ? LIMIT ?", like, limit);
    results.posts = posts.map((r) => ({ id: r.id, content: r.content, createdAt: r.created_at }));
  }
  if (type === "all" || type === "products") {
    const products = await all(env,
      "SELECT * FROM products WHERE status='active' AND (title LIKE ? OR description LIKE ?) LIMIT ?",
      like, like, limit);
    results.products = products.map((r) => ({ id: r.id, title: r.title, price: r.price, images: safeJson(r.images, []), category: r.category }));
  }
  if (type === "all" || type === "events") {
    const events = await all(env,
      "SELECT * FROM events WHERE status='published' AND title LIKE ? LIMIT ?", like, limit);
    results.events = events.map((r) => ({ id: r.id, title: r.title, startDate: r.start_date, category: r.category }));
  }
  if (type === "all" || type === "groups") {
    const groups = await all(env,
      "SELECT * FROM groups WHERE name LIKE ? LIMIT ?", like, limit);
    results.groups = groups.map((r) => ({ id: r.id, name: r.name, memberCount: r.member_count }));
  }
  if (type === "all" || type === "news") {
    const news = await all(env,
      "SELECT * FROM news WHERE title LIKE ? LIMIT ?", like, limit);
    results.news = news.map((r) => ({ id: r.id, title: r.title, excerpt: r.excerpt }));
  }
  if (type === "all" || type === "gallery") {
    const gallery = await all(env,
      "SELECT * FROM gallery_items WHERE approved=1 AND title LIKE ? LIMIT ?", like, limit);
    results.gallery = gallery.map((r) => ({ id: r.id, title: r.title, mediaUrl: r.media_url }));
  }

  const total = Object.values(results).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
  return ok({ results, total });
}

async function getSuggestions(env, q) {
  const like = `%${q}%`;
  const users = await all(env, "SELECT username FROM users WHERE full_name LIKE ? LIMIT 5", like);
  const posts = await all(env, "SELECT content FROM posts WHERE content LIKE ? LIMIT 5", like);
  const products = await all(env, "SELECT title FROM products WHERE title LIKE ? LIMIT 5", like);
  const events = await all(env, "SELECT title FROM events WHERE title LIKE ? LIMIT 5", like);
  const set = new Set();
  users.forEach((u) => u.username && set.add(u.username));
  posts.forEach((p) => p.content && set.add(p.content.slice(0, 60)));
  products.forEach((p) => set.add(p.title));
  events.forEach((e) => set.add(e.title));
  return Array.from(set).slice(0, 10);
}
