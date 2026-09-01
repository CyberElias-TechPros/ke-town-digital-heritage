// Auth middleware — verifies JWT, loads the user, enforces roles.
import { verifyJwt } from "./auth.js";
import { bearerToken, unauthorized, forbidden } from "./http.js";
import { first } from "./db.js";

/**
 * Resolve the authenticated user from the request. Returns { user } or { error: Response }.
 * Must be called by route handlers; injects env JWT secret from binding/env var.
 */
export async function requireUser(request, env) {
  const token = bearerToken(request);
  if (!token) return { error: unauthorized("Authentication required") };

  const secret = env.JWT_SECRET || "ke-kingdom-dev-secret-change-me";
  const payload = await verifyJwt(token, secret);
  if (!payload || !payload.sub) return { error: unauthorized("Invalid or expired session") };

  const user = await first(env, "SELECT * FROM users WHERE id = ?", payload.sub);
  if (!user) return { error: unauthorized("Account not found") };
  if (user.account_status === "suspended") {
    return { error: forbidden("Your account has been suspended") };
  }
  if (user.account_status === "deactivated") {
    return { error: forbidden("Your account has been deactivated") };
  }

  return { user, payload };
}

/** Convenience: parse user from DB row into API shape. */
export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    fullName: row.full_name,
    email: row.email,
    username: row.username,
    role: row.role,
    accountStatus: row.account_status,
    emailVerified: !!row.email_verified,
    avatar: row.avatar,
    bio: row.bio,
    location: row.location,
    isSeller: !!row.is_seller,
    shopName: row.shop_name,
    shopVerified: !!row.shop_verified,
    sellerRating: row.seller_rating,
    totalSales: row.total_sales,
    profileVisibility: row.profile_visibility,
    allowMessages: !!row.allow_messages,
    showOnlineStatus: !!row.show_online_status,
    verified: !!row.verified,
    followers: safeJson(row.followers),
    following: safeJson(row.following),
    blockedUsers: safeJson(row.blocked_users),
    mutedUsers: safeJson(row.muted_users),
    createdAt: row.created_at,
  };
}

/** Minimal public view (no email, no block lists) for other users. */
export function minimalUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    fullName: row.full_name,
    username: row.username,
    avatar: row.avatar,
    bio: row.bio,
    location: row.location,
    role: row.role,
    isSeller: !!row.is_seller,
    shopName: row.shop_name,
    shopVerified: !!row.shop_verified,
    sellerRating: row.seller_rating,
    totalSales: row.total_sales,
    verified: !!row.verified,
  };
}

export function safeJson(v, fallback = []) {
  if (!v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

const ADMIN_ROLES = ["admin"];
const MOD_ROLES = ["admin", "moderator"];
const CONTENT_ROLES = ["admin", "moderator", "content_manager"];
const SELLER_ROLES = ["admin", "seller_manager"];

export function isAdmin(user) {
  return !!user && ADMIN_ROLES.includes(user.role);
}
export function isModerator(user) {
  return !!user && MOD_ROLES.includes(user.role);
}
export function isContentManager(user) {
  return !!user && CONTENT_ROLES.includes(user.role);
}
export function isSellerManager(user) {
  return !!user && SELLER_ROLES.includes(user.role);
}
