// Content & information routes: news, elder stories, oral history, jobs, directory,
// environment, projects, genealogy, donations, mentorship, reports.
import {
  ok, badRequest, forbidden, notFound, parseBody, queryParams,
} from "../lib/http.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, minimalUser, safeJson } from "../lib/middleware.js";

export async function handleContent(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;
  const parts = path.split("/").filter(Boolean);
  const head = parts[0];

  switch (head) {
    case "news": return handleNews(request, env, parts, method);
    case "elder-stories": return handleElderStories(request, env, parts, method);
    case "oral-history": return handleOralHistory(request, env, parts, method);
    case "jobs": return handleJobs(request, env, parts, method, url);
    case "directory": return handleDirectory(request, env, parts, method);
    case "environment": return handleEnvironment(request, env, parts, method);
    case "projects": return handleProjects(request, env, parts, method);
    case "genealogy": return handleGenealogy(request, env, parts, method, url);
    case "war-canoe": return handleWarCanoe(request, env, parts, method, url);
    case "donations": return handleDonations(request, env, parts, method);
    case "mentorship": return handleMentorship(request, env, parts, method, url);
    case "reports": return handleReports(request, env, parts, method);
    default: return notFound(`No content route for /api/${path}`);
  }
}

// Generic CRUD driver for simple entities
async function genericCRUD(request, env, parts, method, table, shape, publicOnly = true) {
  const url = new URL(request.url);
  if (parts.length === 1 && method === "GET") {
    const qp = queryParams(url);
    const limit = Math.min(parseInt(qp.limit) || 50, 200);
    const rows = await all(env, `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ?`, limit);
    return ok({ items: rows.map(shape), [plural(table)]: rows.map(shape) });
  }
  if (parts.length === 1 && method === "POST") {
    return notFound("Create not configured for " + table);
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, `SELECT * FROM ${table} WHERE id = ?`, parts[1]);
    if (!row) return notFound("Not found");
    return ok({ item: shape(row) });
  }
  return notFound(`No ${table} route`);
}
const plural = (t) => t.endsWith("s") ? t : t + "s";

// ------------------------------------------------------------
// NEWS
// ------------------------------------------------------------
async function handleNews(request, env, parts, method) {
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM news WHERE published=1 ORDER BY created_at DESC LIMIT 100");
    return ok({ news: rows.map(newsShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    if (!["admin", "moderator", "content_manager"].includes(user.role)) return forbidden();
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Title is required");
    const id = newId();
    await run(env,
      "INSERT INTO news (id, author_id, title, slug, excerpt, content, cover_image, category, tags, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
      id, user.id, body.title, slugify(body.title, id), body.excerpt || null, body.content || "",
      body.coverImage || null, body.category || null, JSON.stringify(body.tags || []), now(), now());
    const row = await first(env, "SELECT * FROM news WHERE id = ?", id);
    return ok({ item: newsShape(row) }, 201);
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM news WHERE id = ?", parts[1]);
    if (!row) return notFound("News not found");
    return ok({ item: newsShape(row) });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM news WHERE id = ?", parts[1]);
    if (!existing) return notFound("News not found");
    await run(env, "UPDATE news SET title=?, excerpt=?, content=?, category=?, cover_image=?, tags=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.excerpt ?? existing.excerpt, body.content ?? existing.content,
      body.category ?? existing.category, body.coverImage ?? existing.cover_image,
      JSON.stringify(body.tags ?? safeJson(existing.tags, [])), now(), parts[1]);
    const row = await first(env, "SELECT * FROM news WHERE id = ?", parts[1]);
    return ok({ item: newsShape(row) });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    if (!["admin", "moderator", "content_manager"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM news WHERE id = ?", parts[1]);
    return ok({ message: "News deleted" });
  }
  return notFound("No news route");
}
function newsShape(row) {
  return {
    id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt, content: row.content,
    coverImage: row.cover_image, category: row.category, tags: safeJson(row.tags, []),
    authorId: row.author_id, likeCount: row.like_count, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// ELDER STORIES
// ------------------------------------------------------------
async function handleElderStories(request, env, parts, method) {
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM elder_stories WHERE approved=1 ORDER BY created_at DESC LIMIT 100");
    return ok({ stories: rows.map(esShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Title is required");
    const id = newId();
    await run(env,
      "INSERT INTO elder_stories (id, author_id, title, elder_name, content, media, approved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, body.title, body.elderName || null, body.content || "", JSON.stringify(body.media || []),
      ["admin", "moderator", "content_manager"].includes(user.role) ? 1 : 0, now(), now());
    const row = await first(env, "SELECT * FROM elder_stories WHERE id = ?", id);
    return ok({ story: esShape(row) }, 201);
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM elder_stories WHERE id = ?", parts[1]);
    if (!row) return notFound("Story not found");
    return ok({ story: esShape(row) });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM elder_stories WHERE id = ?", parts[1]);
    if (!existing) return notFound("Story not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "UPDATE elder_stories SET title=?, elder_name=?, content=?, media=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.elderName ?? existing.elder_name, body.content ?? existing.content,
      JSON.stringify(body.media ?? safeJson(existing.media, [])), now(), parts[1]);
    const row = await first(env, "SELECT * FROM elder_stories WHERE id = ?", parts[1]);
    return ok({ story: esShape(row) });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM elder_stories WHERE id = ?", parts[1]);
    if (!existing) return notFound("Story not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM elder_stories WHERE id = ?", parts[1]);
    return ok({ message: "Story deleted" });
  }
  return notFound("No elder-stories route");
}
function esShape(row) {
  return {
    id: row.id, title: row.title, elderName: row.elder_name, content: row.content,
    media: safeJson(row.media, []), approved: !!row.approved, authorId: row.author_id, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// ORAL HISTORY
// ------------------------------------------------------------
async function handleOralHistory(request, env, parts, method) {
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM oral_histories ORDER BY created_at DESC LIMIT 100");
    return ok({ histories: rows.map(ohShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Title is required");
    const id = newId();
    await run(env,
      "INSERT INTO oral_histories (id, author_id, title, language, category, content, media, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, body.title, body.language || null, body.category || null, body.content || "",
      JSON.stringify(body.media || []), now(), now());
    const row = await first(env, "SELECT * FROM oral_histories WHERE id = ?", id);
    return ok({ history: ohShape(row) }, 201);
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM oral_histories WHERE id = ?", parts[1]);
    if (!row) return notFound("Oral history not found");
    return ok({ history: ohShape(row) });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM oral_histories WHERE id = ?", parts[1]);
    if (!existing) return notFound("Oral history not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "UPDATE oral_histories SET title=?, language=?, category=?, content=?, media=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.language ?? existing.language, body.category ?? existing.category,
      body.content ?? existing.content, JSON.stringify(body.media ?? safeJson(existing.media, [])), now(), parts[1]);
    const row = await first(env, "SELECT * FROM oral_histories WHERE id = ?", parts[1]);
    return ok({ history: ohShape(row) });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM oral_histories WHERE id = ?", parts[1]);
    if (!existing) return notFound("Oral history not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM oral_histories WHERE id = ?", parts[1]);
    return ok({ message: "Oral history deleted" });
  }
  return notFound("No oral-history route");
}
function ohShape(row) {
  return {
    id: row.id, title: row.title, language: row.language, category: row.category, content: row.content,
    media: safeJson(row.media, []), authorId: row.author_id, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// JOBS
// ------------------------------------------------------------
async function handleJobs(request, env, parts, method, url) {
  if (parts.length === 1 && method === "GET") {
    const qp = queryParams(url);
    let sql = "SELECT * FROM jobs WHERE status='active'";
    const binds = [];
    if (qp.type) { sql += " AND type = ?"; binds.push(qp.type); }
    if (qp.category) { sql += " AND category = ?"; binds.push(qp.category); }
    if (qp.location) { sql += " AND location LIKE ?"; binds.push(`%${qp.location}%`); }
    if (qp.search) { sql += " AND title LIKE ?"; binds.push(`%${qp.search}%`); }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const rows = await all(env, sql, ...binds);
    return ok({ jobs: rows.map(jobShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Job title is required");
    const id = newId();
    await run(env,
      "INSERT INTO jobs (id, author_id, title, type, category, company, location, description, requirements, salary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, body.title, body.type || null, body.category || null, body.company || null,
      body.location || null, body.description || "", JSON.stringify(body.requirements || []), body.salary || null, now(), now());
    const row = await first(env, "SELECT * FROM jobs WHERE id = ?", id);
    return ok({ job: jobShape(row) }, 201);
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM jobs WHERE id = ?", parts[1]);
    if (!row) return notFound("Job not found");
    return ok({ job: jobShape(row) });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM jobs WHERE id = ?", parts[1]);
    if (!existing) return notFound("Job not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "UPDATE jobs SET title=?, type=?, category=?, company=?, location=?, description=?, requirements=?, salary=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.type ?? existing.type, body.category ?? existing.category,
      body.company ?? existing.company, body.location ?? existing.location, body.description ?? existing.description,
      JSON.stringify(body.requirements ?? safeJson(existing.requirements, [])), body.salary ?? existing.salary, now(), parts[1]);
    const row = await first(env, "SELECT * FROM jobs WHERE id = ?", parts[1]);
    return ok({ job: jobShape(row) });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM jobs WHERE id = ?", parts[1]);
    if (!existing) return notFound("Job not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM jobs WHERE id = ?", parts[1]);
    return ok({ message: "Job deleted" });
  }
  return notFound("No jobs route");
}
function jobShape(row) {
  return {
    id: row.id, title: row.title, type: row.type, category: row.category, company: row.company,
    location: row.location, description: row.description, requirements: safeJson(row.requirements, []),
    salary: row.salary, status: row.status, authorId: row.author_id, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// DIRECTORY
// ------------------------------------------------------------
async function handleDirectory(request, env, parts, method) {
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM directory_members WHERE approved=1 ORDER BY created_at DESC LIMIT 200");
    return ok({ members: rows.map(dirShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const body = await parseBody(request);
    if (!body?.fullName) return badRequest("Full name is required");
    const id = newId();
    await run(env,
      "INSERT INTO directory_members (id, full_name, business, category, phone, email, address, website, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, body.fullName, body.business || null, body.category || null, body.phone || null, body.email || null,
      body.address || null, body.website || null, body.description || null, now(), now());
    return ok({ member: { id, fullName: body.fullName } }, 201);
  }
  return notFound("No directory route");
}
function dirShape(row) {
  return {
    id: row.id, fullName: row.full_name, business: row.business, category: row.category,
    phone: row.phone, email: row.email, address: row.address, website: row.website,
    description: row.description, approved: !!row.approved, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// ENVIRONMENT
// ------------------------------------------------------------
async function handleEnvironment(request, env, parts, method) {
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM environment_reports ORDER BY created_at DESC LIMIT 200");
    return ok({ reports: rows.map(envShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Title is required");
    const id = newId();
    await run(env,
      "INSERT INTO environment_reports (id, author_id, title, category, description, location, media, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, body.title, body.category || null, body.description || "", body.location || null,
      JSON.stringify(body.media || []), now(), now());
    const row = await first(env, "SELECT * FROM environment_reports WHERE id = ?", id);
    return ok({ report: envShape(row) }, 201);
  }
  return notFound("No environment route");
}
function envShape(row) {
  return { id: row.id, title: row.title, category: row.category, description: row.description, location: row.location, media: safeJson(row.media, []), status: row.status, createdAt: row.created_at };
}

// ------------------------------------------------------------
// PROJECTS
// ------------------------------------------------------------
async function handleProjects(request, env, parts, method) {
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM projects ORDER BY created_at DESC LIMIT 100");
    return ok({ projects: rows.map(projShape) });
  }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    if (!body?.title) return badRequest("Title is required");
    const id = newId();
    await run(env,
      "INSERT INTO projects (id, author_id, title, category, description, cover_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, body.title, body.category || null, body.description || "", body.coverImage || null, now(), now());
    const row = await first(env, "SELECT * FROM projects WHERE id = ?", id);
    return ok({ project: projShape(row) }, 201);
  }
  if (parts.length === 2 && method === "GET") {
    const row = await first(env, "SELECT * FROM projects WHERE id = ?", parts[1]);
    if (!row) return notFound("Project not found");
    return ok({ project: projShape(row) });
  }
  if (parts.length === 2 && method === "PUT") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const existing = await first(env, "SELECT * FROM projects WHERE id = ?", parts[1]);
    if (!existing) return notFound("Project not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "UPDATE projects SET title=?, category=?, description=?, updated_at=? WHERE id=?",
      body.title ?? existing.title, body.category ?? existing.category, body.description ?? existing.description, now(), parts[1]);
    const row = await first(env, "SELECT * FROM projects WHERE id = ?", parts[1]);
    return ok({ project: projShape(row) });
  }
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM projects WHERE id = ?", parts[1]);
    if (!existing) return notFound("Project not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return forbidden();
    await run(env, "DELETE FROM projects WHERE id = ?", parts[1]);
    return ok({ message: "Project deleted" });
  }
  return notFound("No projects route");
}
function projShape(row) {
  return {
    id: row.id, title: row.title, category: row.category, description: row.description,
    status: row.status, updates: safeJson(row.updates, []), coverImage: row.cover_image,
    authorId: row.author_id, createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// GENEALOGY (basic)
// ------------------------------------------------------------
async function handleGenealogy(request, env, parts, method, url) {
  if (parts.length === 1 && method === "GET") return ok({ tree: null });
  if (parts[1] === "tree" && method === "GET") return ok({ tree: null });
  if (parts[1] === "houses" && method === "GET") {
    const qp = queryParams(url);
    const rows = await all(env, "SELECT * FROM projects WHERE category = ? ORDER BY created_at DESC LIMIT 200", "war-canoe");
    return ok({ houses: rows.map(projShape) });
  }
  if (parts.length === 3 && parts[1] === "houses" && method === "GET") {
    const row = await first(env, "SELECT * FROM projects WHERE id = ?", parts[2]);
    if (!row) return notFound("House not found");
    return ok({ house: projShape(row) });
  }
  if (parts[1] === "trees") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    if (parts.length === 2 && method === "GET") return ok({ trees: [] });
    if (parts.length === 2 && method === "POST") {
      const body = await parseBody(request);
      return ok({ tree: { id: newId(), name: body?.name || "Family Tree", members: [] } }, 201);
    }
    if (parts.length === 3 && method === "GET") return ok({ tree: { id: parts[2], members: [] } });
    if (parts.length === 3 && method === "PUT") return ok({ tree: { id: parts[2] } });
    if (parts.length === 3 && method === "DELETE") return ok({ message: "Tree deleted" });
    if (parts.length >= 4 && parts[3] === "members") {
      if (parts.length === 4 && method === "POST") {
        const body = await parseBody(request);
        return ok({ member: { id: newId(), ...body } }, 201);
      }
      if (parts.length === 5 && method === "GET") return ok({ member: { id: parts[4] } });
      if (parts.length === 5 && method === "PUT") return ok({ member: { id: parts[4] } });
      if (parts.length === 5 && method === "DELETE") return ok({ message: "Member deleted" });
      if (parts.length === 5 && parts[4] === "search") return ok({ members: [] });
    }
  }
  return notFound("No genealogy route");
}

// ------------------------------------------------------------
// WAR CANOE
// ------------------------------------------------------------
async function handleWarCanoe(request, env, parts, method, url) {
  if (parts.length === 2 && parts[1] === "houses" && method === "GET") {
    const rows = await all(env, "SELECT * FROM projects WHERE category = ? ORDER BY created_at DESC LIMIT 200", "war-canoe");
    return ok({ houses: rows.map(projShape) });
  }
  return ok({ houses: [] });
}

// ------------------------------------------------------------
// DONATIONS
// ------------------------------------------------------------
async function handleDonations(request, env, parts, method) {
  if (parts.length === 2 && parts[1] === "initialize" && method === "POST") {
    const body = await parseBody(request);
    return ok({ reference: newId(), amount: body?.amount, status: "pending" });
  }
  if (parts.length === 2 && parts[1] === "verify" && method === "POST") {
    return ok({ verified: true, status: "success" });
  }
  if (parts.length === 2 && parts[1] === "stats" && method === "GET") {
    return ok({ totalRaised: 0, totalDonations: 0, goal: 1000000 });
  }
  if (parts.length === 2 && parts[1] === "recent" && method === "GET") return ok({ donations: [] });
  return notFound("No donations route");
}

// ------------------------------------------------------------
// MENTORSHIP
// ------------------------------------------------------------
async function handleMentorship(request, env, parts, method, url) {
  if (parts.length === 2 && parts[1] === "mentors" && method === "GET") return ok({ mentors: [] });
  if (parts.length === 2 && parts[1] === "mentees" && method === "GET") return ok({ mentees: [] });
  if (parts.length === 2 && parts[1] === "register" && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    return ok({ message: "Registered as mentor" }, 201);
  }
  if (parts.length === 2 && parts[1] === "request" && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    return ok({ message: "Mentorship requested" }, 201);
  }
  if (parts.length === 2 && parts[1] === "my" && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    return ok({ mentorship: [] });
  }
  return notFound("No mentorship route");
}

// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------
async function handleReports(request, env, parts, method) {
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    await run(env,
      "INSERT INTO reports (id, reporter_id, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      newId(), user.id, body?.targetType || null, body?.targetId || null, body?.reason || null, now());
    return ok({ message: "Report submitted" }, 201);
  }
  if (parts.length === 1 && method === "GET") {
    const rows = await all(env, "SELECT * FROM reports ORDER BY created_at DESC LIMIT 100");
    return ok({ reports: rows.map((r) => ({ id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason, status: r.status, createdAt: r.created_at })) });
  }
  return notFound("No reports route");
}

function slugify(text, fallback) {
  const s = String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || fallback.slice(0, 8);
}
