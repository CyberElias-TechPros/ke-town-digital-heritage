// User routes: profiles, followers/following, follow/unfollow, user posts, suggestions.
import { ok, badRequest, notFound, queryParams } from "../lib/http.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, publicUser, minimalUser } from "../lib/middleware.js";
import { hydratePostsHelper } from "./helpers.js";

export async function handleUsers(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api\/users/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;
  const parts = path.split("/").filter(Boolean);

  // GET /users/suggested
  if (parts.length === 1 && parts[0] === "suggested" && method === "GET") {
    return suggestedUsers(env);
  }

  // GET /users/profile/:identifier
  if (parts.length === 2 && parts[0] === "profile" && method === "GET") {
    return userProfile(env, parts[1]);
  }

  if (parts.length >= 1) {
    const target = parts[0];
    // follow / unfollow
    if (parts.length === 2 && method === "POST") {
      if (parts[1] === "follow") return follow(request, env, target);
      if (parts[1] === "unfollow") return unfollow(request, env, target);
    }
    // lists
    if (parts.length === 2 && method === "GET") {
      if (parts[1] === "posts") return userPosts(env, target, url);
      if (parts[1] === "followers") return userFollowers(env, target, url);
      if (parts[1] === "following") return userFollowing(env, target, url);
    }
  }
  return notFound(`No users route for ${method} /api/users/${path}`);
}

async function suggestedUsers(env) {
  const rows = await all(
    env,
    "SELECT * FROM users WHERE account_status='active' ORDER BY total_sales DESC, created_at DESC LIMIT 10"
  );
  return ok({ users: rows.map(minimalUser) });
}

async function userProfile(env, identifier) {
  const row = await first(
    env,
    "SELECT * FROM users WHERE id = ? OR username = ? LIMIT 1",
    identifier, identifier
  );
  if (!row) return notFound("User not found");
  return ok({ user: publicUser(row) });
}

async function userPosts(env, userId, url) {
  const qp = queryParams(url);
  const limit = Math.min(parseInt(qp.limit) || 20, 100);
  const offset = ((parseInt(qp.page) || 1) - 1) * limit;
  const rows = await all(
    env,
    "SELECT * FROM posts WHERE author_id = ? AND status='active' AND privacy='public' ORDER BY created_at DESC LIMIT ? OFFSET ?",
    userId, limit, offset
  );
  return ok({ posts: await hydratePostsHelper(env, rows, null) });
}

async function userFollowers(env, userId, url) {
  const qp = queryParams(url);
  const limit = Math.min(parseInt(qp.limit) || 20, 100);
  const offset = ((parseInt(qp.page) || 1) - 1) * limit;
  const rows = await all(
    env,
    "SELECT u.* FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?",
    userId, limit, offset
  );
  return ok({ users: rows.map(minimalUser) });
}

async function userFollowing(env, userId, url) {
  const qp = queryParams(url);
  const limit = Math.min(parseInt(qp.limit) || 20, 100);
  const offset = ((parseInt(qp.page) || 1) - 1) * limit;
  const rows = await all(
    env,
    "SELECT u.* FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?",
    userId, limit, offset
  );
  return ok({ users: rows.map(minimalUser) });
}

async function follow(request, env, targetId) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  if (user.id === targetId) return badRequest("You cannot follow yourself");
  await run(env, "INSERT OR IGNORE INTO follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, ?)",
    newId(), user.id, targetId, now());
  await run(env,
    "INSERT INTO activities (id, user_id, type, action, target_type, target_id, metadata, created_at) VALUES (?, ?, 'follow', 'followed', 'user', ?, ?, ?)",
    newId(), user.id, targetId, JSON.stringify({}), now());
  return ok({ message: "Followed", following: true });
}

async function unfollow(request, env, targetId) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  await run(env, "DELETE FROM follows WHERE follower_id = ? AND following_id = ?", user.id, targetId);
  return ok({ message: "Unfollowed", following: false });
}
