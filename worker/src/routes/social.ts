/**
 * Social graph + content feed.
 * Covers: posting, reactions, comments, saves, follows, activity streams.
 */
import { Hono } from 'hono';
import { newId } from '../lib/crypto';
import { all, count, first, run } from '../lib/db';
import { badRequest, clampInt, forbidden, notFound } from '../lib/http';
import { requireAuth, isStaff } from '../middleware';
import {
  authorMap,
  authorRef,
  hydrateUser,
  loadUser,
  publicUser,
  serializeComment,
  serializePost,
  type Row,
} from '../lib/users';
import { logActivity, notify, trackAnalytics } from '../lib/notify';
import { emit } from '../realtime';
import type { Env, AppEnv } from '../types';

export const posts = new Hono<AppEnv>();
export const comments = new Hono<AppEnv>();
export const social = new Hono<AppEnv>();
export const users = new Hono<AppEnv>();

/* ============================== POSTS ============================== */

const postSelect = 'SELECT * FROM posts WHERE id = ?';

async function postOr404(db: D1Database, id: string): Promise<Row> {
  const row = await first<Row>(db, postSelect, id);
  if (!row) throw notFound('That post no longer exists.');
  return row;
}

posts.get('/feed', async (c) => {
  const user = await requireAuth(c);
  const limit = clampInt(c.req.query('limit'), 20, 1, 60);

  // Followed authors first, then the rest of the community, newest first.
  const rows = await all<Row>(
    c.env.DB,
    `SELECT p.*, (SELECT COUNT(*) FROM follows f WHERE f.following_id = p.author_id AND f.follower_id = ?) AS following_author
       FROM posts p
      WHERE p.status = 'active'
        AND (p.visibility IN ('community', 'public')
             OR p.author_id = ?
             OR (p.visibility = 'followers' AND EXISTS (
                   SELECT 1 FROM follows f WHERE f.following_id = p.author_id AND f.follower_id = ?)))
      ORDER BY p.is_pinned DESC, following_author DESC, p.created_at DESC
      LIMIT ?`,
    user.id,
    user.id,
    user.id,
    limit,
  );
  const serialized = await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user.id)));
  return c.json(serialized);
});

posts.get('/trending', async (c) => {
  const user = c.get('user');
  const limit = clampInt(c.req.query('limit'), 12, 1, 60);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts
      WHERE status = 'active' AND visibility IN ('community', 'public')
      ORDER BY (like_count * 3 + comment_count * 4 + view_count * 0.2 + share_count * 5) DESC, created_at DESC
      LIMIT ?`,
    limit,
  );
  return c.json(await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user?.id ?? null))));
});

posts.get('/saved', async (c) => {
  const user = await requireAuth(c);
  // The client renders `{ _id, post, savedAt }`, so keep the wrapper rather
  // than flattening to a bare post list.
  const rows = await all<Row>(
    c.env.DB,
    `SELECT p.*, s.created_at AS saved_at FROM posts p
       JOIN saved_posts s ON s.post_id = p.id
      WHERE s.user_id = ? AND p.status = 'active'
      ORDER BY s.created_at DESC`,
    user.id,
  );
  const items = await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user.id)));
  return c.json(
    items.map((post, i) => ({
      _id: `saved_${post._id}`,
      post,
      savedAt: String(rows[i].saved_at ?? rows[i].created_at),
    })),
  );
});

posts.get('/user/my', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts WHERE author_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 100`,
    user.id,
  );
  return c.json(await Promise.all(rows.map((r) => serializePost(c.env.DB, r, user.id))));
});

posts.get('/', async (c) => {
  const viewer = c.get('user');
  const limit = clampInt(c.req.query('limit'), 20, 1, 60);
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const category = c.req.query('category');
  const where = [`status = 'active'`, `visibility IN ('community','public')`];
  const params: (string | number)[] = [];
  if (category) {
    where.push(`(content LIKE ? OR feeling = ?)`);
    params.push(`%${category}%`, category);
  }
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts WHERE ${where.join(' AND ')} ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );
  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM posts WHERE ${where.join(' AND ')}`, ...params);
  return c.json({
    posts: await Promise.all(rows.map((r) => serializePost(c.env.DB, r, viewer?.id ?? null))),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

posts.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const content = String(body.content ?? '').trim();
  const media = Array.isArray(body.media) ? body.media.slice(0, 10) : [];
  if (!content && !media.length) throw badRequest('Write something or attach media before posting.');
  if (content.length > 5000) throw badRequest('Posts are limited to 5,000 characters.');

  const visibility = ['public', 'community', 'followers', 'private'].includes(String(body.visibility ?? body.privacy))
    ? String(body.visibility ?? body.privacy)
    : 'community';

  const id = newId('pst_');
  await run(
    c.env.DB,
    `INSERT INTO posts (id, author_id, content, media, location, feeling, privacy, visibility, group_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id,
    user.id,
    content,
    JSON.stringify(media),
    body.location ? JSON.stringify(body.location) : null,
    String(body.feeling ?? ''),
    visibility,
    visibility,
    body.groupId ? String(body.groupId) : null,
  );

  if (body.groupId) {
    await run(c.env.DB, 'UPDATE groups SET post_count = post_count + 1 WHERE id = ?', String(body.groupId));
    const members = await all<{ user_id: string }>(
      c.env.DB,
      `SELECT user_id FROM group_members WHERE group_id = ? AND status = 'active' AND user_id <> ?`,
      String(body.groupId),
      user.id,
    );
    for (const m of members) {
      await notify(c.env, {
        userId: m.user_id,
        fromId: user.id,
        type: 'group_post',
        message: `${user.fullName} posted in your group`,
        link: `/groups/${body.groupId}`,
      });
    }
  }

  await logActivity(c.env, {
    userId: user.id,
    type: 'post_created',
    targetType: 'post',
    targetId: id,
    message: `${user.fullName} shared a post`,
    visibility: visibility === 'private' ? 'private' : 'public',
  });
  await trackAnalytics(c.env, { userId: user.id, eventType: 'post_created', entityType: 'post', entityId: id, request: c.req.raw });

  const row = await postOr404(c.env.DB, id);
  const post = await serializePost(c.env.DB, row, user.id);
  await emit(c.env, 'post_update', post, { room: 'broadcast' });
  return c.json(post, 201);
});

posts.get('/:id', async (c) => {
  const viewer = c.get('user');
  const row = await postOr404(c.env.DB, c.req.param('id'));
  await run(c.env.DB, 'UPDATE posts SET view_count = view_count + 1 WHERE id = ?', String(row.id));
  await trackAnalytics(c.env, {
    userId: viewer?.id ?? null,
    eventType: 'post_view',
    entityType: 'post',
    entityId: String(row.id),
    request: c.req.raw,
  });
  return c.json(await serializePost(c.env.DB, row, viewer?.id ?? null));
});

posts.put('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await postOr404(c.env.DB, c.req.param('id'));
  if (String(row.author_id) !== user.id && !isStaff(user)) throw forbidden('You can only edit your own posts.');
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (body.content !== undefined) {
    sets.push('content = ?');
    params.push(String(body.content).slice(0, 5000));
  }
  if (body.media !== undefined) {
    sets.push('media = ?');
    params.push(JSON.stringify(Array.isArray(body.media) ? body.media : []));
  }
  if (body.feeling !== undefined) {
    sets.push('feeling = ?');
    params.push(String(body.feeling));
  }
  if (body.visibility !== undefined) {
    sets.push('visibility = ?');
    sets.push('privacy = ?');
    params.push(String(body.visibility), String(body.visibility));
  }
  if (body.isPinned !== undefined && (String(row.author_id) === user.id || isStaff(user))) {
    sets.push('is_pinned = ?');
    params.push(body.isPinned ? 1 : 0);
  }
  if (!sets.length) return c.json(await serializePost(c.env.DB, row, user.id));
  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE posts SET ${sets.join(', ')} WHERE id = ?`, ...params, String(row.id));
  return c.json(await serializePost(c.env.DB, await postOr404(c.env.DB, String(row.id)), user.id));
});

posts.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await postOr404(c.env.DB, c.req.param('id'));
  if (String(row.author_id) !== user.id && !isStaff(user)) throw forbidden('You can only delete your own posts.');
  await run(c.env.DB, `UPDATE posts SET status = 'deleted' WHERE id = ?`, String(row.id));
  await logActivity(c.env, {
    userId: user.id,
    type: 'post_deleted',
    targetType: 'post',
    targetId: String(row.id),
    visibility: 'private',
  });
  return c.json({ message: 'Post deleted.' });
});

posts.post('/:id/reaction', async (c) => {
  const user = await requireAuth(c);
  const row = await postOr404(c.env.DB, c.req.param('id'));
  const reactionType = String((await c.req.json().catch(() => ({}))).reactionType ?? 'like');
  const valid = ['like', 'love', 'celebrate', 'insightful', 'proud', 'support'];
  if (!valid.includes(reactionType)) throw badRequest(`Reaction must be one of: ${valid.join(', ')}`);

  const existing = await first<Row>(
    c.env.DB,
    'SELECT * FROM post_reactions WHERE post_id = ? AND user_id = ?',
    String(row.id),
    user.id,
  );
  if (existing) {
    await run(
      c.env.DB,
      'UPDATE post_reactions SET reaction_type = ? WHERE id = ?',
      reactionType,
      String(existing.id),
    );
  } else {
    await run(
      c.env.DB,
      `INSERT INTO post_reactions (id, post_id, user_id, reaction_type, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      newId('rxn_'),
      String(row.id),
      user.id,
      reactionType,
    );
    await run(c.env.DB, 'UPDATE posts SET like_count = like_count + 1 WHERE id = ?', String(row.id));
  }

  if (String(row.author_id) !== user.id) {
    await notify(c.env, {
      userId: String(row.author_id),
      fromId: user.id,
      type: 'like',
      message: `${user.fullName} reacted to your post`,
      link: `/posts`,
      data: { postId: String(row.id), reactionType },
    });
    await logActivity(c.env, {
      userId: user.id,
      type: 'reaction',
      targetType: 'post',
      targetId: String(row.id),
      message: `${user.fullName} reacted to a post`,
      data: { authorId: String(row.author_id) },
    });
  }

  const updated = await serializePost(c.env.DB, await postOr404(c.env.DB, String(row.id)), user.id);
  await emit(c.env, 'new_reaction', { postId: String(row.id), userId: user.id, reactionType }, { room: 'broadcast' });
  return c.json(updated);
});

posts.delete('/:id/reaction', async (c) => {
  const user = await requireAuth(c);
  const postId = c.req.param('id');
  await run(c.env.DB, 'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?', postId, user.id);
  await run(
    c.env.DB,
    'UPDATE posts SET like_count = MAX(0, (SELECT COUNT(*) FROM post_reactions WHERE post_id = ?)) WHERE id = ?',
    postId,
    postId,
  );
  const row = await postOr404(c.env.DB, postId);
  return c.json(await serializePost(c.env.DB, row, user.id));
});

posts.post('/:id/like', async (c) => {
  const user = await requireAuth(c);
  const postId = c.req.param('id');
  await postOr404(c.env.DB, postId);
  const existing = await first(c.env.DB, 'SELECT id FROM post_reactions WHERE post_id = ? AND user_id = ?', postId, user.id);
  if (!existing) {
    await run(
      c.env.DB,
      `INSERT INTO post_reactions (id, post_id, user_id, reaction_type, created_at)
       VALUES (?, ?, ?, 'like', datetime('now'))`,
      newId('rxn_'),
      postId,
      user.id,
    );
    await run(c.env.DB, 'UPDATE posts SET like_count = like_count + 1 WHERE id = ?', postId);
    const row = await first<Row>(c.env.DB, 'SELECT author_id FROM posts WHERE id = ?', postId);
    if (row && String(row.author_id) !== user.id) {
      await notify(c.env, {
        userId: String(row.author_id),
        fromId: user.id,
        type: 'like',
        message: `${user.fullName} liked your post`,
        link: `/posts`,
      });
    }
  }
  return c.json(await serializePost(c.env.DB, await postOr404(c.env.DB, postId), user.id));
});

posts.post('/:id/comment', async (c) => {
  const user = await requireAuth(c);
  const post = await postOr404(c.env.DB, c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const content = String(body.content ?? '').trim();
  if (!content) throw badRequest('Comment cannot be empty.');
  if (content.length > 2000) throw badRequest('Comments are limited to 2,000 characters.');

  const id = newId('cmt_');
  await run(
    c.env.DB,
    `INSERT INTO comments (id, author_id, content, target_type, target_id, parent_id, created_at)
     VALUES (?, ?, ?, 'post', ?, ?, datetime('now'))`,
    id,
    user.id,
    content,
    String(post.id),
    body.parentCommentId ? String(body.parentCommentId) : null,
  );
  await run(c.env.DB, 'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', String(post.id));

  if (String(post.author_id) !== user.id) {
    await notify(c.env, {
      userId: String(post.author_id),
      fromId: user.id,
      type: 'comment',
      message: `${user.fullName} commented on your post`,
      link: `/posts`,
      data: { postId: String(post.id) },
    });
  }
  await logActivity(c.env, {
    userId: user.id,
    type: 'comment',
    targetType: 'post',
    targetId: String(post.id),
    message: `${user.fullName} commented on a post`,
  });

  const comment = await first<Row>(c.env.DB, 'SELECT * FROM comments WHERE id = ?', id);
  const serialized = await serializeComment(c.env.DB, comment!);
  await emit(c.env, 'comment_added', serialized, { room: 'broadcast' });
  return c.json(serialized, 201);
});

posts.post('/:id/save', async (c) => {
  const user = await requireAuth(c);
  await postOr404(c.env.DB, c.req.param('id'));
  await run(
    c.env.DB,
    `INSERT OR IGNORE INTO saved_posts (user_id, post_id, created_at) VALUES (?, ?, datetime('now'))`,
    user.id,
    c.req.param('id'),
  );
  return c.json({ message: 'Saved to your collection.', saved: true });
});

posts.delete('/:id/save', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', user.id, c.req.param('id'));
  return c.json({ message: 'Removed from your collection.', saved: false });
});

posts.get('/:id/comments', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    'SELECT * FROM comments WHERE target_type = ? AND target_id = ? AND status = ? ORDER BY created_at ASC',
    'post',
    c.req.param('id'),
    'active',
  );
  return c.json(await Promise.all(rows.map((r) => serializeComment(c.env.DB, r))));
});

/* ============================ COMMENTS ============================ */

comments.get('/:targetType/:targetId', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM comments WHERE target_type = ? AND target_id = ? AND status = 'active' ORDER BY created_at ASC`,
    c.req.param('targetType'),
    c.req.param('targetId'),
  );
  return c.json(await Promise.all(rows.map((r) => serializeComment(c.env.DB, r))));
});

comments.post('/', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const content = String(body.content ?? '').trim();
  const targetType = String(body.targetType ?? 'post');
  const targetId = String(body.targetId ?? '');
  if (!content) throw badRequest('Comment cannot be empty.');
  if (!targetId) throw badRequest('targetId is required.');

  const id = newId('cmt_');
  await run(
    c.env.DB,
    `INSERT INTO comments (id, author_id, content, target_type, target_id, parent_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    id,
    user.id,
    content,
    targetType,
    targetId,
    body.parentCommentId ? String(body.parentCommentId) : null,
  );
  if (targetType === 'post') {
    await run(c.env.DB, 'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', targetId);
  }
  const row = await first<Row>(c.env.DB, 'SELECT * FROM comments WHERE id = ?', id);
  return c.json(await serializeComment(c.env.DB, row!), 201);
});

comments.delete('/:id', async (c) => {
  const user = await requireAuth(c);
  const row = await first<Row>(c.env.DB, 'SELECT * FROM comments WHERE id = ?', c.req.param('id'));
  if (!row) throw notFound('Comment not found.');
  if (String(row.author_id) !== user.id && !isStaff(user)) throw forbidden('You can only delete your own comments.');
  await run(c.env.DB, `UPDATE comments SET status = 'deleted' WHERE id = ?`, String(row.id));
  if (String(row.target_type) === 'post') {
    await run(
      c.env.DB,
      `UPDATE posts SET comment_count = MAX(0, (SELECT COUNT(*) FROM comments WHERE target_id = ? AND status = 'active')) WHERE id = ?`,
      String(row.target_id),
      String(row.target_id),
    );
  }
  return c.json({ message: 'Comment deleted.' });
});

/* ============================= SOCIAL ============================= */

function activityRow(r: Row, author: Row): Row {
  return {
    _id: String(r.id),
    id: String(r.id),
    type: String(r.type),
    targetType: r.target_type ? String(r.target_type) : null,
    targetId: r.target_id ? String(r.target_id) : null,
    message: String(r.message ?? ''),
    data: JSON.parse(String(r.data ?? '{}')),
    user: author,
    createdAt: String(r.created_at),
  };
}

async function serializeActivities(db: D1Database, rows: Row[]): Promise<Row[]> {
  const map = await authorMap(db, rows.map((r) => String(r.user_id)));
  return rows.map((r) =>
    activityRow(r, map.get(String(r.user_id)) ?? { _id: '', fullName: 'KE Town', avatar: '', role: 'user' }),
  );
}

social.get('/following', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT a.* FROM activities a
       JOIN follows f ON f.following_id = a.user_id
      WHERE f.follower_id = ? AND a.visibility = 'public'
      ORDER BY a.created_at DESC LIMIT 50`,
    user.id,
  );
  return c.json(await serializeActivities(c.env.DB, rows));
});

social.get('/me', async (c) => {
  const user = await requireAuth(c);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    user.id,
  );
  return c.json(await serializeActivities(c.env.DB, rows));
});

social.get('/global', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM activities WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 50`,
  );
  return c.json(await serializeActivities(c.env.DB, rows));
});

/* ============================== USERS ============================== */

users.get('/suggested', async (c) => {
  const viewer = c.get('user');
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM users
      WHERE account_status = 'active'
        AND (? IS NULL OR id <> ?)
        AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
      ORDER BY verified DESC, total_sales DESC, created_at DESC
      LIMIT 12`,
    viewer?.id ?? null,
    viewer?.id ?? null,
    viewer?.id ?? '',
  );
  const hydrated = await Promise.all(rows.map((r) => hydrateUser(c.env.DB, r)));
  return c.json(
    hydrated.map((u) => ({
      ...publicUser(u),
      followerCount: u.followers.length,
      isFollowing: false,
    })),
  );
});

users.get('/:id/posts', async (c) => {
  const viewer = c.get('user');
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 20, 1, 60);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM posts WHERE author_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    c.req.param('id'),
    limit,
    (page - 1) * limit,
  );
  const total = await count(
    c.env.DB,
    `SELECT COUNT(*) AS n FROM posts WHERE author_id = ? AND status = 'active'`,
    c.req.param('id'),
  );
  return c.json({
    posts: await Promise.all(rows.map((r) => serializePost(c.env.DB, r, viewer?.id ?? null))),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

async function userEdges(db: D1Database, sql: string, param: string, page: number, limit: number) {
  const rows = await all<Row>(db, `${sql} LIMIT ? OFFSET ?`, param, limit, (page - 1) * limit);
  const total = await count(db, `SELECT COUNT(*) AS n FROM (${sql})`, param);
  const ids = rows.map((r) => String(r.peer));
  const map = await authorMap(db, ids);
  return {
    users: ids.map((id) => map.get(id)).filter(Boolean),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

users.get('/:id/followers', async (c) => {
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 20, 1, 100);
  return c.json(
    await userEdges(
      c.env.DB,
      `SELECT follower_id AS peer FROM follows WHERE following_id = ? ORDER BY created_at DESC`,
      c.req.param('id'),
      page,
      limit,
    ),
  );
});

users.get('/:id/following', async (c) => {
  const page = clampInt(c.req.query('page'), 1, 1, 1000);
  const limit = clampInt(c.req.query('limit'), 20, 1, 100);
  return c.json(
    await userEdges(
      c.env.DB,
      `SELECT following_id AS peer FROM follows WHERE follower_id = ? ORDER BY created_at DESC`,
      c.req.param('id'),
      page,
      limit,
    ),
  );
});

users.post('/:id/follow', async (c) => {
  const user = await requireAuth(c);
  const targetId = c.req.param('id');
  if (targetId === user.id) throw badRequest('You cannot follow yourself.');
  const target = await loadUser(c.env.DB, targetId);
  if (!target) throw notFound('User not found.');

  const blocked = await first(c.env.DB, 'SELECT 1 AS x FROM blocks WHERE blocker_id = ? AND blocked_id = ?', targetId, user.id);
  if (blocked) throw forbidden('This member is not accepting follows right now.');

  await run(
    c.env.DB,
    `INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, datetime('now'))`,
    user.id,
    targetId,
  );
  await notify(c.env, {
    userId: targetId,
    fromId: user.id,
    type: 'follow',
    message: `${user.fullName} started following you`,
    link: `/profile/${user.username ?? user.id}`,
  });
  await logActivity(c.env, {
    userId: user.id,
    type: 'follow',
    targetType: 'user',
    targetId,
    message: `${user.fullName} followed ${target.fullName}`,
    data: { followingId: targetId },
  });
  await emit(c.env, 'follow_update', { followerId: user.id, followingId: targetId, type: 'follow' }, { room: 'broadcast' });
  const refreshed = await loadUser(c.env.DB, targetId);
  return c.json({
    message: `You are now following ${target.fullName}.`,
    following: true,
    followerCount: refreshed?.followers.length ?? 0,
  });
});

users.post('/:id/unfollow', async (c) => {
  const user = await requireAuth(c);
  const targetId = c.req.param('id');
  await run(c.env.DB, 'DELETE FROM follows WHERE follower_id = ? AND following_id = ?', user.id, targetId);
  const refreshed = await loadUser(c.env.DB, targetId);
  return c.json({
    message: 'Unfollowed.',
    following: false,
    followerCount: refreshed?.followers.length ?? 0,
  });
});

users.post('/:id/block', async (c) => {
  const user = await requireAuth(c);
  const targetId = c.req.param('id');
  if (targetId === user.id) throw badRequest('You cannot block yourself.');
  await run(
    c.env.DB,
    `INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, datetime('now'))`,
    user.id,
    targetId,
  );
  await run(c.env.DB, 'DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', user.id, targetId, targetId, user.id);
  return c.json({ message: 'Member blocked. They can no longer see your profile or message you.', blocked: true });
});

users.post('/:id/unblock', async (c) => {
  const user = await requireAuth(c);
  await run(c.env.DB, 'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', user.id, c.req.param('id'));
  return c.json({ message: 'Member unblocked.', blocked: false });
});

users.get('/:id', async (c) => {
  const user = await loadUser(c.env.DB, c.req.param('id'));
  if (!user) throw notFound('User not found.');
  const postCount = await count(c.env.DB, `SELECT COUNT(*) AS n FROM posts WHERE author_id = ? AND status = 'active'`, user.id);
  return c.json({ user: { ...publicUser(user), postCount }, postCount });
});

export { authorRef };
