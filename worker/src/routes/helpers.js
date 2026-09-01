// Shared helpers across route modules.
import { first } from "../lib/db.js";
import { minimalUser, safeJson } from "../lib/middleware.js";

/** Hydrate post rows into API shape (used by modules that join users). */
export async function hydratePostsHelper(env, rows, viewerId) {
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
      likedByViewer: liked, author: minimalUser(author),
    });
  }
  return out;
}

export async function getOptionalViewer(request, env) {
  const { bearerToken } = await import("../lib/http.js");
  const { verifyJwt } = await import("../lib/auth.js");
  const token = bearerToken(request);
  if (!token) return null;
  const secret = env.JWT_SECRET || "ke-kingdom-dev-secret-change-me";
  const payload = await verifyJwt(token, secret);
  return payload ? payload.sub : null;
}
