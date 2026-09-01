// Social routes: posts, feed, comments, reactions, follows, activity, saved posts.
import {
  ok, badRequest, unauthorized, forbidden, notFound, parseBody, queryParams,
} from "../lib/http.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, publicUser, minimalUser, safeJson } from "../lib/middleware.js";

export async function handleSocial(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return notFound();

  // Saved posts
  if (parts[0] === "saved-posts") return savedPosts(request, env);

  // Feed
  if (parts[0] === "feed" || (parts[0] === "ai" && parts[1] === "feed")) {
    return getFeed(request, env);
  }

  // Comments
  if (parts[0] === "comments") return handleComments(request, env, parts, method);

  // Social activity
  if (parts[0] === "social") return handleSocialActivity(request, env, parts, method);

  // Posts
  if (parts[0] === "posts") return handlePosts(request, env, parts, method);

  return notFound(`No social route for ${method} /api/${path}`);
}

// ------------------------------------------------------------
// POSTS
// ------------------------------------------------------------
async function handlePosts(request, env, parts, method) {
  const url = new URL(request.url);

  // POST /posts
  if (parts.length === 1 && method === "POST") return createPost(request, env);
  // GET /posts
  if (parts.length === 1 && method === "GET") return listPosts(request, env);
  // GET /posts/feed
  if (parts.length === 2 && parts[1] === "feed" && method === "GET") return getFeed(request, env);
  // GET /posts/trending
  if (parts.length === 2 && parts[1] === "trending" && method === "GET") return trendingPosts(env);
  // GET /posts/user/my
  if (parts.length === 3 && parts[1] === "user" && parts[2] === "my" && method === "GET") {
    return myPosts(request, env);
  }

  // /posts/:id/...
  if (parts.length >= 2) {
    const id = parts[1];
    if (parts.length === 2 && method === "GET") return getPost(id, env);
    if (parts.length === 2 && method === "PUT") return updatePost(request, env, id);
    if (parts.length === 2 && method === "DELETE") return deletePost(request, env, id);
    if (parts.length === 3) {
      if (parts[2] === "reaction") return handleReaction(request, env, id, method);
      if (parts[2] === "like") {
        if (method === "POST") return likePost(request, env, id);
        return badRequest("Use DELETE /posts/:id/reaction to unlike");
      }
      if (parts[2] === "comment" && method === "POST") return addComment(request, env, id);
      if (parts[2] === "save") return handleSavePost(request, env, id, method);
    }
  }
  return notFound(`No posts route for ${method} /api/posts/${parts.slice(1).join("/")}`);
}

function postShape(row, viewerId) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    content: row.content,
    media: safeJson(row.media, []),
    location: row.location ? safeJson(row.location, row.location) : null,
    feeling: row.feeling,
    privacy: row.privacy,
    visibility: row.visibility,
    groupId: row.group_id,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    savedCount: row.saved_count,
    createdAt: row.created_at,
    author: minimalUser(row.author_id ? { ...row, id: row.author_id, full_name: row.author_name, avatar: row.author_avatar, username: row.author_username, is_seller: row.author_is_seller, shop_name: row.author_shop_name } : null),
    likedByViewer: !!row.liked_by_viewer,
  };
}

async function hydratePosts(env, rows, viewerId) {
  if (!rows.length) return [];
  const out = [];
  for (const r of rows) {
    const author = await first(env, "SELECT * FROM users WHERE id = ?", r.author_id);
    let liked = false;
    if (viewerId) {
      const lr = await first(env, "SELECT id FROM reactions WHERE post_id = ? AND user_id = ?", r.id, viewerId);
      liked = !!lr;
    }
    out.push({
      id: r.id, _id: r.id, content: r.content, media: safeJson(r.media, []),
      location: r.location ? safeJson(r.location, r.location) : null,
      feeling: r.feeling, privacy: r.privacy, visibility: r.visibility, groupId: r.group_id,
      likeCount: r.like_count, commentCount: r.comment_count, shareCount: r.share_count,
      savedCount: r.saved_count, createdAt: r.created_at, updatedAt: r.updated_at,
      likedByViewer: liked,
      author: minimalUser(author),
    });
  }
  return out;
}

async function createPost(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const content = (body.content || "").toString().trim();
  if (!content) return badRequest("Post content is required");

  const id = newId();
  const ts = now();
  await run(
    env,
    `INSERT INTO posts (id, author_id, content, media, location, feeling, privacy, visibility, group_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, user.id, content, JSON.stringify(body.media || []),
    body.location ? JSON.stringify(body.location) : null,
    body.feeling || null,
    body.privacy || "public", body.visibility || "public",
    body.groupId || null, ts, ts
  );
  await run(
    env,
    "INSERT INTO activities (id, user_id, type, action, target_type, target_id, metadata, created_at) VALUES (?, ?, 'post', 'created', 'post', ?, ?, ?)",
    newId(), user.id, id, JSON.stringify({}), ts
  );
  const row = await first(env, "SELECT * FROM posts WHERE id = ?", id);
  return ok({ post: (await hydratePosts(env, [row], user.id))[0] }, 201);
}

async function listPosts(request, env) {
  const qp = queryParams(request.url);
  const limit = Math.min(parseInt(qp.limit) || 20, 100);
  const offset = ((parseInt(qp.page) || 1) - 1) * limit;
  const rows = await all(
    env,
    "SELECT * FROM posts WHERE status = 'active' AND privacy = 'public' ORDER BY created_at DESC LIMIT ? OFFSET ?",
    limit, offset
  );
  return ok({ posts: await hydratePosts(env, rows, null) });
}

async function getFeed(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const qp = queryParams(request.url);
  const limit = Math.min(parseInt(qp.limit) || 20, 100);
  const offset = ((parseInt(qp.page) || 1) - 1) * limit;

  // Feed = posts from followed users + own posts + public posts
  const followed = await all(env, "SELECT following_id FROM follows WHERE follower_id = ?", user.id);
  const ids = followed.map((f) => f.following_id);
  let rows;
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    rows = await all(
      env,
      `SELECT * FROM posts WHERE status='active' AND (author_id IN (${placeholders}) OR author_id = ? OR privacy='public')
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ...ids, user.id, limit, offset
    );
  } else {
    rows = await all(
      env,
      `SELECT * FROM posts WHERE status='active' AND (author_id = ? OR privacy='public') ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      user.id, limit, offset
    );
  }
  return ok({ posts: await hydratePosts(env, rows, user.id) });
}

async function myPosts(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const rows = await all(env, "SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC", user.id);
  return ok({ posts: await hydratePosts(env, rows, user.id) });
}

async function trendingPosts(env) {
  const rows = await all(
    env,
    "SELECT * FROM posts WHERE status='active' AND privacy='public' ORDER BY like_count DESC, comment_count DESC LIMIT 10"
  );
  return ok({ posts: await hydratePosts(env, rows, null) });
}

async function getPost(id, env) {
  const row = await first(env, "SELECT * FROM posts WHERE id = ?", id);
  if (!row) return notFound("Post not found");
  return ok({ post: (await hydratePosts(env, [row], null))[0] });
}

async function updatePost(request, env, id) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const existing = await first(env, "SELECT * FROM posts WHERE id = ?", id);
  if (!existing) return notFound("Post not found");
  if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) {
    return forbidden("You can only edit your own posts");
  }
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const content = body.content !== undefined ? body.content.toString().trim() : existing.content;
  await run(env, "UPDATE posts SET content = ?, media = ?, feeling = ?, visibility = ?, updated_at = ? WHERE id = ?",
    content, JSON.stringify(body.media || safeJson(existing.media, [])), body.feeling ?? existing.feeling,
    body.visibility ?? existing.visibility, now(), id);
  const row = await first(env, "SELECT * FROM posts WHERE id = ?", id);
  return ok({ post: (await hydratePosts(env, [row], user.id))[0] });
}

async function deletePost(request, env, id) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const existing = await first(env, "SELECT id, author_id FROM posts WHERE id = ?", id);
  if (!existing) return notFound("Post not found");
  if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) {
    return forbidden("You can only delete your own posts");
  }
  await run(env, "DELETE FROM posts WHERE id = ?", id);
  return ok({ message: "Post deleted" });
}

async function handleReaction(request, env, postId, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const post = await first(env, "SELECT id FROM posts WHERE id = ?", postId);
  if (!post) return notFound("Post not found");
  if (method === "POST") {
    const body = await parseBody(request);
    const type = body?.reactionType || "like";
    await run(env, "INSERT OR IGNORE INTO reactions (id, post_id, user_id, type, created_at) VALUES (?, ?, ?, ?, ?)",
      newId(), postId, user.id, type, now());
    await run(env, "UPDATE posts SET like_count = (SELECT COUNT(*) FROM reactions WHERE post_id = ?), updated_at = ? WHERE id = ?",
      postId, now(), postId);
    return ok({ message: "Reaction added", liked: true });
  }
  if (method === "DELETE") {
    await run(env, "DELETE FROM reactions WHERE post_id = ? AND user_id = ?", postId, user.id);
    await run(env, "UPDATE posts SET like_count = (SELECT COUNT(*) FROM reactions WHERE post_id = ?), updated_at = ? WHERE id = ?",
      postId, now(), postId);
    return ok({ message: "Reaction removed", liked: false });
  }
  return badRequest("Method not allowed");
}

async function likePost(request, env, postId) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const post = await first(env, "SELECT id FROM posts WHERE id = ?", postId);
  if (!post) return notFound("Post not found");
  await run(env, "INSERT OR IGNORE INTO reactions (id, post_id, user_id, type, created_at) VALUES (?, ?, ?, 'like', ?)",
    newId(), postId, user.id, now());
  await run(env, "UPDATE posts SET like_count = (SELECT COUNT(*) FROM reactions WHERE post_id = ?), updated_at = ? WHERE id = ?",
    postId, now(), postId);
  return ok({ message: "Liked", liked: true });
}

async function handleSavePost(request, env, postId, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const post = await first(env, "SELECT id FROM posts WHERE id = ?", postId);
  if (!post) return notFound("Post not found");
  if (method === "POST") {
    await run(env, "INSERT OR IGNORE INTO saved_posts (id, user_id, post_id, created_at) VALUES (?, ?, ?, ?)",
      newId(), user.id, postId, now());
    return ok({ message: "Saved" });
  }
  if (method === "DELETE") {
    await run(env, "DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?", user.id, postId);
    return ok({ message: "Unsaved" });
  }
  return badRequest("Method not allowed");
}

async function savedPosts(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const rows = await all(
    env,
    `SELECT p.* FROM saved_posts sp JOIN posts p ON p.id = sp.post_id
     WHERE sp.user_id = ? ORDER BY sp.created_at DESC`,
    user.id
  );
  return ok({ posts: await hydratePosts(env, rows, user.id) });
}

// ------------------------------------------------------------
// COMMENTS
// ------------------------------------------------------------
async function handleComments(request, env, parts, method) {
  // POST /comments { content, targetType, targetId }
  if (parts.length === 1 && method === "POST") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const body = await parseBody(request);
    const content = (body?.content || "").toString().trim();
    if (!content) return badRequest("Comment content is required");
    if (!body?.targetType || !body?.targetId) return badRequest("targetType and targetId are required");
    const id = newId();
    await run(
      env,
      "INSERT INTO comments (id, author_id, target_type, target_id, parent_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      id, user.id, body.targetType, body.targetId, body.parentCommentId || null, content, now(), now()
    );
    if (body.targetType === "post") {
      await run(env, "UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE target_type='post' AND target_id=?), updated_at = ? WHERE id = ?",
        body.targetId, now(), body.targetId);
    }
    const row = await first(env, "SELECT * FROM comments WHERE id = ?", id);
    return ok({ comment: commentShape(row) }, 201);
  }

  // GET /comments/:targetType/:targetId
  if (parts.length === 3 && method === "GET") {
    const [, targetType, targetId] = parts;
    const rows = await all(
      env,
      "SELECT * FROM comments WHERE target_type = ? AND target_id = ? AND status='active' ORDER BY created_at ASC",
      targetType, targetId
    );
    const out = [];
    for (const r of rows) {
      const author = await first(env, "SELECT * FROM users WHERE id = ?", r.author_id);
      out.push({ ...commentShape(r), author: minimalUser(author) });
    }
    return ok({ comments: out });
  }

  // DELETE /comments/:id
  if (parts.length === 2 && method === "DELETE") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const existing = await first(env, "SELECT * FROM comments WHERE id = ?", parts[1]);
    if (!existing) return notFound("Comment not found");
    if (existing.author_id !== user.id && !["admin", "moderator"].includes(user.role)) {
      return forbidden("You can only delete your own comments");
    }
    await run(env, "DELETE FROM comments WHERE id = ?", parts[1]);
    return ok({ message: "Comment deleted" });
  }
  return notFound("No comments route");
}

function commentShape(row) {
  return {
    id: row.id, _id: row.id, content: row.content, targetType: row.target_type,
    targetId: row.target_id, parentId: row.parent_id, createdAt: row.created_at,
  };
}

async function addComment(request, env, postId) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const post = await first(env, "SELECT id FROM posts WHERE id = ?", postId);
  if (!post) return notFound("Post not found");
  const body = await parseBody(request);
  const content = (body?.content || "").toString().trim();
  if (!content) return badRequest("Comment content is required");
  const id = newId();
  await run(
    env,
    "INSERT INTO comments (id, author_id, target_type, target_id, parent_id, content, created_at, updated_at) VALUES (?, ?, 'post', ?, ?, ?, ?, ?)",
    id, user.id, postId, body?.parentCommentId || null, content, now(), now()
  );
  await run(env, "UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE target_type='post' AND target_id=?), updated_at = ? WHERE id = ?",
    postId, now(), postId);
  const row = await first(env, "SELECT * FROM comments WHERE id = ?", id);
  const author = await first(env, "SELECT * FROM users WHERE id = ?", user.id);
  return ok({ comment: { ...commentShape(row), author: minimalUser(author) } }, 201);
}

// ------------------------------------------------------------
// SOCIAL ACTIVITY
// ------------------------------------------------------------
async function handleSocialActivity(request, env, parts, method) {
  // /social/following
  if (parts[1] === "following" && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const followed = await all(env, "SELECT following_id FROM follows WHERE follower_id = ?", user.id);
    const ids = followed.map((f) => f.following_id);
    let rows = [];
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      rows = await all(env,
        `SELECT * FROM activities WHERE user_id IN (${ph}) ORDER BY created_at DESC LIMIT 50`,
        ...ids);
    }
    return ok({ activities: rows.map(activityShape) });
  }
  // /social/me
  if (parts[1] === "me" && method === "GET") {
    const { user, error } = await requireUser(request, env);
    if (error) return error;
    const rows = await all(env, "SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", user.id);
    return ok({ activities: rows.map(activityShape) });
  }
  // /social/global
  if (parts[1] === "global" && method === "GET") {
    const rows = await all(env, "SELECT * FROM activities ORDER BY created_at DESC LIMIT 50");
    return ok({ activities: rows.map(activityShape) });
  }
  return notFound("No social activity route");
}

function activityShape(r) {
  return {
    id: r.id, userId: r.user_id, type: r.type, action: r.action,
    targetType: r.target_type, targetId: r.target_id,
    metadata: safeJson(r.metadata, {}), createdAt: r.created_at,
  };
}
