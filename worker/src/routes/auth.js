// Auth routes: register, login, profile, password, account, tokens, admin user mgmt.
import {
  ok, badRequest, unauthorized, forbidden, notFound, json, parseBody, queryParams,
} from "../lib/http.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signJwt, hashValue } from "../lib/auth.js";
import { newId, now, run, first, all } from "../lib/db.js";
import { requireUser, publicUser, minimalUser, safeJson, isAdmin } from "../lib/middleware.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (e) => typeof e === "string" && EMAIL_RE.test(e);

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function handleAuth(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api\/auth/, "") || "/";
  if (path.startsWith("/")) path = path.slice(1);
  const method = request.method;

  // Admin user management (routes under /api/auth/users) must be checked first
  if (path.startsWith("users")) return handleUserManagement(request, env, path, method);

  switch (path) {
    case "register":
      return register(request, env);
    case "login":
      return login(request, env);
    case "me":
      return me(request, env);
    case "profile":
      return updateProfile(request, env);
    case "password":
      return updatePassword(request, env);
    case "account":
      return deleteAccount(request, env);
    case "forgot-password":
      return forgotPassword(request, env);
    case "reset-password":
      return resetPassword(request, env);
    case "verify-email":
      return verifyEmail(request, env);
    case "permissions":
      return permissions(request, env);
    default:
      return notFound(`Unknown auth route: ${path}`);
  }
}

async function issueToken(env, user) {
  const secret = env.JWT_SECRET || "ke-kingdom-dev-secret-change-me";
  return signJwt({ sub: user.id }, secret, 60 * 60 * 24 * 7);
}

async function register(request, env) {
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const { fullName, email, password, username } = body;

  if (!fullName || typeof fullName !== "string") return badRequest("Full name is required");
  if (!isEmail(email)) return badRequest("A valid email is required");
  if (!password || password.length < 8) return badRequest("Password must be at least 8 characters");

  const existing = await first(env, "SELECT id FROM users WHERE email = ?", email.toLowerCase().trim());
  if (existing) return badRequest("An account with this email already exists");

  const id = newId();
  const nowMs = now();
  const hash = await hashPassword(password);
  const uname = username || slugify(email.split("@")[0]);
  const uniqueUname = await ensureUniqueUsername(env, uname);

  await run(
    env,
    `INSERT INTO users (id, full_name, email, username, password_hash, role, account_status, email_verified, is_seller, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'user', 'active', 0, 0, ?, ?)`,
    id, fullName, email.toLowerCase().trim(), uniqueUname, hash, nowMs, nowMs
  );

  const row = await first(env, "SELECT * FROM users WHERE id = ?", id);
  const token = await issueToken(env, row);
  await audit(env, id, "register", "user", id, { email });
  return json({ user: publicUser(row), token }, 201);
}

async function ensureUniqueUsername(env, base) {
  let uname = base;
  let i = 1;
  while (await first(env, "SELECT id FROM users WHERE username = ?", uname)) {
    uname = `${base}${i}`;
    i++;
  }
  return uname;
}

async function login(request, env) {
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const { email, password } = body;
  if (!isEmail(email) || !password) return unauthorized("Invalid email or password");

  const row = await first(env, "SELECT * FROM users WHERE email = ?", email.toLowerCase().trim());
  if (!row) return unauthorized("Invalid email or password");

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return unauthorized("Invalid email or password");

  if (row.account_status === "suspended") return forbidden("Your account has been suspended");
  if (row.account_status === "deactivated") return forbidden("Your account has been deactivated");

  const token = await issueToken(env, row);
  await audit(env, row.id, "login", "user", row.id, {});
  return ok({ user: publicUser(row), token });
}

async function me(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  return ok({ user: publicUser(user) });
}

async function updateProfile(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");

  const allowed = [
    "fullName", "username", "avatar", "bio", "location", "isSeller", "shopName",
    "profileVisibility", "allowMessages", "showOnlineStatus", "blockedUsers",
    "mutedUsers", "following", "followers", "email",
  ];
  const sets = [];
  const binds = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      const col = {
        fullName: "full_name", username: "username", avatar: "avatar", bio: "bio",
        location: "location", isSeller: "is_seller", shopName: "shop_name",
        profileVisibility: "profile_visibility", allowMessages: "allow_messages",
        showOnlineStatus: "show_online_status", blockedUsers: "blocked_users",
        mutedUsers: "muted_users", following: "following", followers: "followers",
      }[key];
      if (!col) continue;
      let val = body[key];
      if (["blockedUsers", "mutedUsers", "following", "followers"].includes(key)) {
        val = JSON.stringify(body[key] || []);
      }
      if (key === "email" && isEmail(body[key])) {
        const dup = await first(env, "SELECT id FROM users WHERE email = ? AND id != ?", body[key].toLowerCase().trim(), user.id);
        if (dup) return badRequest("Email already in use");
        sets.push("email = ?");
        binds.push(body[key].toLowerCase().trim());
        continue;
      }
      sets.push(`${col} = ?`);
      binds.push(val);
    }
  }
  if (sets.length === 0) return ok({ user: publicUser(user) });

  binds.push(now(), user.id);
  await run(env, `UPDATE users SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`, ...binds);
  const row = await first(env, "SELECT * FROM users WHERE id = ?", user.id);
  await audit(env, user.id, "update_profile", "user", user.id, {});
  return ok({ user: publicUser(row) });
}

async function updatePassword(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const { currentPassword, newPassword } = body;
  if (!newPassword || newPassword.length < 8) return badRequest("New password must be at least 8 characters");

  const valid = await verifyPassword(currentPassword || "", user.password_hash);
  if (!valid) return badRequest("Current password is incorrect");

  const hash = await hashPassword(newPassword);
  await run(env, "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", hash, now(), user.id);
  await audit(env, user.id, "change_password", "user", user.id, {});
  return ok({ message: "Password updated" });
}

async function deleteAccount(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  await run(env, "DELETE FROM users WHERE id = ?", user.id);
  await audit(env, user.id, "delete_account", "user", user.id, {});
  return ok({ message: "Account deleted" });
}

async function forgotPassword(request, env) {
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const { email } = body;
  const row = await first(env, "SELECT * FROM users WHERE email = ?", String(email || "").toLowerCase().trim());
  // Always return success to avoid account enumeration
  if (row) {
    const rawToken = newId() + newId();
    const id = newId();
    const expires = now() + 60 * 60 * 1000; // 1 hour
    await run(
      env,
      "INSERT INTO tokens (id, user_id, kind, token_hash, expires_at, created_at) VALUES (?, ?, 'password_reset', ?, ?, ?)",
      id, row.id, await hashValue(rawToken), expires, now()
    );
    await audit(env, row.id, "forgot_password", "user", row.id, {});
    // In dev, return the token so the reset flow can be tested end-to-end.
    // In production, an Email Worker must deliver this token to the user.
    const dev = env.ENVIRONMENT && env.ENVIRONMENT !== "production";
    return ok({ message: "If an account exists, a reset link has been sent.", ...(dev ? { resetToken: rawToken } : {}) });
  }
  return ok({ message: "If an account exists, a reset link has been sent." });
}

async function resetPassword(request, env) {
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const { token, newPassword } = body;
  if (!token || !newPassword || newPassword.length < 8) return badRequest("Invalid token or weak password");

  const tokenRow = await first(
    env,
    "SELECT * FROM tokens WHERE kind = 'password_reset' AND token_hash = ? AND expires_at > ?",
    await hashValue(token), now()
  );
  if (!tokenRow) return badRequest("Reset token is invalid or has expired");

  const hash = await hashPassword(newPassword);
  await run(env, "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", hash, now(), tokenRow.user_id);
  await run(env, "DELETE FROM tokens WHERE id = ?", tokenRow.id);

  const row = await first(env, "SELECT * FROM users WHERE id = ?", tokenRow.user_id);
  const jwt = await issueToken(env, row);
  await audit(env, row.id, "reset_password", "user", row.id, {});
  return ok({ user: publicUser(row), token: jwt });
}

async function verifyEmail(request, env) {
  const body = await parseBody(request);
  if (!body) return badRequest("Invalid JSON body");
  const { token } = body;
  const tokenRow = await first(
    env,
    "SELECT * FROM tokens WHERE kind = 'email_verify' AND token_hash = ? AND expires_at > ?",
    await hashValue(String(token || "")), now()
  );
  if (!tokenRow) return badRequest("Verification token is invalid or has expired");
  await run(env, "UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", now(), tokenRow.user_id);
  await run(env, "DELETE FROM tokens WHERE id = ?", tokenRow.id);
  return ok({ message: "Email verified" });
}

async function permissions(request, env) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  return ok({
    role: user.role,
    canManageUsers: isAdmin(user),
    canManageContent: ["admin", "moderator", "content_manager"].includes(user.role),
    canManageSellers: ["admin", "seller_manager"].includes(user.role),
    isAdmin: isAdmin(user),
    isModerator: ["admin", "moderator"].includes(user.role),
    isSeller: !!user.is_seller,
  });
}

// ------------------------------------------------------------
// Admin user management (/api/auth/users...)
// ------------------------------------------------------------
async function handleUserManagement(request, env, path, method) {
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  if (!isAdmin(user)) return forbidden("Admin access required");

  const parts = path.split("/").filter(Boolean); // e.g. ["users", "abc123", "role"]

  if (parts.length === 1 && method === "GET") {
    const qp = queryParams(request.url);
    const limit = Math.min(parseInt(qp.limit) || 20, 100);
    const offset = ((parseInt(qp.page) || 1) - 1) * limit;
    let sql = "SELECT * FROM users WHERE 1=1";
    const binds = [];
    if (qp.role) { sql += " AND role = ?"; binds.push(qp.role); }
    if (qp.status) { sql += " AND account_status = ?"; binds.push(qp.status); }
    if (qp.search) { sql += " AND (full_name LIKE ? OR email LIKE ? OR username LIKE ?)"; binds.push(`%${qp.search}%`, `%${qp.search}%`, `%${qp.search}%`); }
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    binds.push(limit, offset);
    const rows = await all(env, sql, ...binds);
    const totalRes = await first(env, "SELECT COUNT(*) AS c FROM users WHERE 1=1");
    return ok({ users: rows.map(publicUser), total: totalRes ? totalRes.c : 0, page: parseInt(qp.page) || 1, limit });
  }

  if (parts.length === 3 && parts[2] === "role" && method === "PUT") {
    const targetId = parts[1];
    const body = await parseBody(request);
    const roles = ["user", "moderator", "content_manager", "seller_manager", "admin"];
    if (!roles.includes(body?.role)) return badRequest("Invalid role");
    await run(env, "UPDATE users SET role = ?, updated_at = ? WHERE id = ?", body.role, now(), targetId);
    await audit(env, user.id, "update_role", "user", targetId, { role: body.role });
    return ok({ message: "Role updated" });
  }

  if (parts.length === 3 && parts[2] === "status" && method === "PUT") {
    const targetId = parts[1];
    const body = await parseBody(request);
    const statuses = ["active", "suspended", "deactivated"];
    if (!statuses.includes(body?.accountStatus)) return badRequest("Invalid status");
    await run(env, "UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?", body.accountStatus, now(), targetId);
    await audit(env, user.id, "update_status", "user", targetId, { status: body.accountStatus });
    return ok({ message: "Status updated" });
  }

  if (parts.length === 3 && parts[2] === "activity" && method === "GET") {
    const targetId = parts[1];
    const qp = queryParams(request.url);
    const limit = Math.min(parseInt(qp.limit) || 20, 100);
    const offset = ((parseInt(qp.page) || 1) - 1) * limit;
    const rows = await all(
      env,
      "SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      targetId, limit, offset
    );
    return ok({ activities: rows.map((r) => ({ ...r, metadata: safeJson(r.metadata, {}) })) });
  }

  return notFound("Unknown user management route");
}

async function audit(env, actor, action, resource, resourceId, metadata = {}) {
  try {
    await run(
      env,
      "INSERT INTO audit_logs (id, actor_id, action, resource, resource_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      newId(), actor, action, resource, resourceId, JSON.stringify(metadata), now()
    );
  } catch (e) {
    console.error("audit write failed", e);
  }
}
