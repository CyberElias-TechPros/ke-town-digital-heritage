/**
 * Auth & account management.
 * Happy path: register → verify → login → me → profile edits → password
 * change → (forgot → reset) → admin user administration.
 */
import { Hono } from 'hono';
import { hashPassword, newId, randomHex, sha256Hex, verifyPassword } from '../lib/crypto';
import { signJwt } from '../lib/jwt';
import { all, count, first, run } from '../lib/db';
import { badRequest, conflict, notFound, unauthorized } from '../lib/http';
import { attachUser, jwtSecret, rateLimit, requireAdmin, requireAuth } from '../middleware';
import { authorMap, hydrateUser, loadUser, publicUser, type Row } from '../lib/users';
import { audit } from '../lib/notify';
import type { Env, AppEnv } from '../types';

const auth = new Hono<AppEnv>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

async function tokenFor(xenv: Env, user: { id: string; email: string; role: string }) {
  return signJwt(
    jwtSecret(xenv),
    { sub: user.id, email: user.email, role: user.role },
    Number(xenv.JWT_TTL_SECONDS ?? 604800),
  );
}

/* ---------------- register ---------------- */
auth.post('/register', async (c) => {
  await rateLimit(c, 'register', 8, 900);
  const body = await c.req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  let username = body.username ? String(body.username).trim().toLowerCase() : null;

  if (fullName.length < 2) throw badRequest('Please enter your full name.');
  if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address.');
  if (password.length < 8) throw badRequest('Password must be at least 8 characters long.');

  const existing = await first(c.env.DB, 'SELECT id FROM users WHERE email = ?', email);
  if (existing) throw conflict('That email is already registered. Try logging in.');

  if (!username) {
    const base =
      fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 16) || 'member';
    username = `${base}${randomHex(2)}`;
  }
  const usernameTaken = await first(c.env.DB, 'SELECT id FROM users WHERE username = ?', username);
  if (usernameTaken) throw conflict('That username is taken. Pick another one.');

  const id = newId('usr_');
  const passwordHash = await hashPassword(password);
  const verifyToken = randomHex(24);

  await run(
    c.env.DB,
    `INSERT INTO users (id, full_name, email, username, password_hash, role, account_status, email_verify_token, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, datetime('now'), datetime('now'))`,
    id,
    fullName,
    email,
    username,
    passwordHash,
    verifyToken,
  );

  await audit(c.env, { userId: id, action: 'register', resource: 'user', resourceId: id });

  const user = await loadUser(c.env.DB, id);
  if (!user) throw badRequest('Could not create account.');
  const token = await tokenFor(c.env, user);

  return c.json(
    {
      message: 'Welcome to KE Town! Your account is ready.',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        accountStatus: user.accountStatus,
        avatar: user.avatar,
        isSeller: user.isSeller,
        shopName: user.shopName,
        shopVerified: user.shopVerified,
      },
      token,
      verificationToken: c.env.EXPOSE_RESET_TOKEN === '1' ? verifyToken : undefined,
    },
    201,
  );
});

/* ---------------- login ---------------- */
auth.post('/login', async (c) => {
  await rateLimit(c, 'login', 12, 900);
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password) throw badRequest('Email and password are required.');

  const row = await first<Row>(c.env.DB, 'SELECT * FROM users WHERE email = ?', email);
  if (!row) throw unauthorized('Invalid email or password.');
  if (String(row.account_status) !== 'active') {
    throw unauthorized('This account is suspended or deactivated. Contact support.');
  }
  if (row.locked_until && new Date(String(row.locked_until)).getTime() > Date.now()) {
    throw unauthorized('Too many failed attempts. Account temporarily locked — try again shortly.');
  }

  const ok = await verifyPassword(password, String(row.password_hash));
  if (!ok) {
    const attempts = Number(row.login_attempts ?? 0) + 1;
    const lockUntil = attempts >= 8 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
    await run(
      c.env.DB,
      'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
      lockUntil ? 0 : attempts,
      lockUntil,
      String(row.id),
    );
    throw unauthorized('Invalid email or password.');
  }

  await run(
    c.env.DB,
    `UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = datetime('now') WHERE id = ?`,
    String(row.id),
  );
  await audit(c.env, { userId: String(row.id), action: 'login', resource: 'user', resourceId: String(row.id) });

  const user = await hydrateUser(c.env.DB, row);
  const token = await tokenFor(c.env, user);

  return c.json({
    message: 'Login successful',
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      isSeller: user.isSeller,
      shopName: user.shopName,
      shopVerified: user.shopVerified,
      verified: user.verified,
    },
    token,
  });
});

/* ---------------- password reset ---------------- */
auth.post('/forgot-password', async (c) => {
  await rateLimit(c, 'forgot', 6, 900);
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const safeMessage = 'If that email is registered, a reset link is on its way.';
  if (!email) throw badRequest('Email is required.');

  const row = await first<Row>(c.env.DB, 'SELECT id FROM users WHERE email = ?', email);
  if (!row) return c.json({ message: safeMessage });

  const raw = randomHex(32);
  await run(
    c.env.DB,
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, datetime('now', '+20 minutes'), datetime('now'))`,
    newId('rst_'),
    String(row.id),
    await sha256Hex(raw),
  );

  return c.json({
    message: safeMessage,
    resetToken: c.env.EXPOSE_RESET_TOKEN === '1' ? raw : undefined,
  });
});

auth.post('/reset-password', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = String(body.token ?? '').trim();
  const newPassword = String(body.newPassword ?? '');
  if (!token) throw badRequest('Reset token is required.');
  if (newPassword.length < 8) throw badRequest('Password must be at least 8 characters long.');

  const hashed = await sha256Hex(token);
  const record = await first<Row>(
    c.env.DB,
    `SELECT * FROM password_resets
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`,
    hashed,
  );
  if (!record) throw badRequest('That reset link is invalid or has expired. Request a new one.');

  await run(c.env.DB, 'UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(newPassword), String(record.user_id));
  await run(c.env.DB, `UPDATE password_resets SET used_at = datetime('now') WHERE id = ?`, String(record.id));
  await audit(c.env, { userId: String(record.user_id), action: 'password_reset', resource: 'user' });

  const user = await loadUser(c.env.DB, String(record.user_id));
  if (!user) throw notFound('Account not found.');
  return c.json({ message: 'Password reset successfully. You can sign in now.', token: await tokenFor(c.env, user) });
});

auth.post('/verify-email', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = String(body.token ?? '').trim();
  if (!token) throw badRequest('Verification token is required.');
  const row = await first<Row>(c.env.DB, 'SELECT id FROM users WHERE email_verify_token = ?', token);
  if (!row) throw badRequest('That verification link is invalid or already used.');
  await run(
    c.env.DB,
    `UPDATE users SET email_verified = 1, email_verify_token = NULL, updated_at = datetime('now') WHERE id = ?`,
    String(row.id),
  );
  return c.json({ message: 'Email verified. Welcome aboard!' });
});

auth.post('/resend-verification', async (c) => {
  const user = await requireAuth(c);
  if (user.emailVerified) return c.json({ message: 'Your email is already verified.' });
  const token = randomHex(24);
  await run(c.env.DB, 'UPDATE users SET email_verify_token = ? WHERE id = ?', token, user.id);
  return c.json({
    message: 'A fresh verification link has been generated.',
    verificationToken: c.env.EXPOSE_RESET_TOKEN === '1' ? token : undefined,
  });
});

/* ---------------- current user ---------------- */
auth.get('/me', async (c) => {
  const user = await requireAuth(c);
  return c.json({ user: publicUser(user, user.id) });
});

auth.put('/profile', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const allowed: Record<string, string> = {
    fullName: 'full_name',
    bio: 'bio',
    location: 'location',
    avatar: 'avatar',
    coverImage: 'cover_image',
    username: 'username',
    language: 'language',
    timezone: 'timezone',
    profileVisibility: 'profile_visibility',
    phone: 'phone',
  };
  const boolFields: Record<string, string> = {
    allowMessages: 'allow_messages',
    showOnlineStatus: 'show_online_status',
  };

  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, col] of Object.entries(allowed)) {
    if (body[key] !== undefined) {
      if (key === 'fullName' && String(body[key]).trim().length < 2) {
        throw badRequest('Full name must be at least 2 characters.');
      }
      if (key === 'username') {
        const uname = String(body[key]).trim().toLowerCase();
        if (!/^[a-z0-9_.]{3,24}$/.test(uname)) {
          throw badRequest('Username must be 3-24 characters (letters, numbers, dot, underscore).');
        }
        const taken = await first(
          c.env.DB,
          'SELECT id FROM users WHERE username = ? AND id <> ?',
          uname,
          user.id,
        );
        if (taken) throw conflict('That username is taken.');
        params.push(uname);
      } else {
        params.push(String(body[key]));
      }
      sets.push(`${col} = ?`);
    }
  }
  for (const [key, col] of Object.entries(boolFields)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(body[key] ? 1 : 0);
    }
  }
  if (Array.isArray(body.interests)) {
    sets.push('interests = ?');
    params.push(JSON.stringify(body.interests.slice(0, 40)));
  }
  if (Array.isArray(body.skills)) {
    sets.push('skills = ?');
    params.push(JSON.stringify(body.skills.slice(0, 40)));
  }

  if (!sets.length) return c.json({ message: 'Nothing to update.', user: publicUser(user, user.id) });

  sets.push(`updated_at = datetime('now')`);
  await run(c.env.DB, `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...params, user.id);
  const updated = await loadUser(c.env.DB, user.id);
  return c.json({ message: 'Profile updated successfully', user: publicUser(updated!, user.id) });
});

auth.put('/password', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');
  if (newPassword.length < 8) throw badRequest('New password must be at least 8 characters long.');

  const row = await first<Row>(c.env.DB, 'SELECT password_hash FROM users WHERE id = ?', user.id);
  if (!row || !(await verifyPassword(currentPassword, String(row.password_hash)))) {
    throw unauthorized('Your current password is incorrect.');
  }
  await run(c.env.DB, `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, await hashPassword(newPassword), user.id);
  await audit(c.env, { userId: user.id, action: 'password_changed', resource: 'user', resourceId: user.id });
  return c.json({ message: 'Password changed successfully.' });
});

auth.delete('/account', async (c) => {
  const user = await requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const password = String(body.password ?? '');
  const row = await first<Row>(c.env.DB, 'SELECT password_hash FROM users WHERE id = ?', user.id);
  if (!password || !row || !(await verifyPassword(password, String(row.password_hash)))) {
    throw unauthorized('Password is incorrect.');
  }
  await run(
    c.env.DB,
    `UPDATE users
        SET account_status = 'deactivated',
            email = ?,
            email_verified = 0,
            updated_at = datetime('now')
      WHERE id = ?`,
    `deleted_${Date.now()}@archived.ketown`,
    user.id,
  );
  await audit(c.env, { userId: user.id, action: 'account_deleted', resource: 'user', resourceId: user.id });
  return c.json({ message: 'Your account has been deactivated. We hope to see you again.' });
});

auth.get('/permissions', async (c) => {
  const user = await requireAuth(c);
  const isAdmin = user.role === 'admin';
  return c.json({
    role: user.role,
    permissions: {
      canManageUsers: isAdmin,
      canManageContent: ['admin', 'moderator', 'content_manager'].includes(user.role),
      canManageSellers: ['admin', 'seller_manager'].includes(user.role),
      canModerate: ['admin', 'moderator'].includes(user.role),
      isAdmin,
      isModerator: user.role === 'moderator',
      isContentManager: user.role === 'content_manager',
      isSellerManager: user.role === 'seller_manager',
    },
  });
});

/* ---------------- admin: user administration ---------------- */
auth.get('/users', async (c) => {
  requireAdmin(c);
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20)));
  const role = c.req.query('role');
  const status = c.req.query('status');
  const search = c.req.query('search');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (role) {
    where.push('role = ?');
    params.push(role);
  }
  if (status) {
    where.push('account_status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(full_name LIKE ? OR email LIKE ? OR username LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = await count(c.env.DB, `SELECT COUNT(*) AS n FROM users ${clause}`, ...params);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM users ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );

  const users = await Promise.all(rows.map((r) => hydrateUser(c.env.DB, r)));
  return c.json({
    users: users.map((u) => publicUser(u)),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

auth.put('/users/:id/role', async (c) => {
  const actor = requireAdmin(c);
  const role = String((await c.req.json().catch(() => ({}))).role ?? '');
  if (!['user', 'moderator', 'content_manager', 'seller_manager', 'admin'].includes(role)) {
    throw badRequest('That role is not recognised.');
  }
  const target = await loadUser(c.env.DB, c.req.param('id'));
  if (!target) throw notFound('User not found.');
  await run(c.env.DB, `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, role, target.id);
  await audit(c.env, {
    userId: actor.id,
    action: 'role_changed',
    resource: 'user',
    resourceId: target.id,
    details: { newRole: role },
  });
  const updated = await loadUser(c.env.DB, target.id);
  return c.json({ message: 'User role updated successfully', user: publicUser(updated!) });
});

auth.put('/users/:id/status', async (c) => {
  const actor = requireAdmin(c);
  const accountStatus = String((await c.req.json().catch(() => ({}))).accountStatus ?? '');
  if (!['active', 'suspended', 'deactivated'].includes(accountStatus)) {
    throw badRequest('That status is not recognised.');
  }
  const target = await loadUser(c.env.DB, c.req.param('id'));
  if (!target) throw notFound('User not found.');
  await run(c.env.DB, `UPDATE users SET account_status = ?, updated_at = datetime('now') WHERE id = ?`, accountStatus, target.id);
  await audit(c.env, {
    userId: actor.id,
    action: 'status_changed',
    resource: 'user',
    resourceId: target.id,
    details: { accountStatus },
  });
  const updated = await loadUser(c.env.DB, target.id);
  return c.json({ message: `User ${accountStatus} successfully`, user: publicUser(updated!) });
});

auth.get('/users/:id/activity', async (c) => {
  requireAdmin(c);
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20)));
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    c.req.param('id'),
    limit,
    (page - 1) * limit,
  );
  return c.json(
    rows.map((r) => ({
      _id: r.id,
      id: r.id,
      action: r.action,
      resource: r.resource,
      resourceId: r.resource_id,
      details: JSON.parse(String(r.details ?? '{}')),
      createdAt: r.created_at,
    })),
  );
});

/* ---------------- public profiles ---------------- */
auth.get('/user/:id', async (c) => {
  const user = await loadUser(c.env.DB, c.req.param('id'));
  if (!user) throw notFound('User not found.');
  return c.json({ user: publicUser(user) });
});

auth.get('/users/by-username/:username', async (c) => {
  const row = await first<Row>(c.env.DB, 'SELECT * FROM users WHERE username = ?', c.req.param('username'));
  if (!row) throw notFound('User not found.');
  const user = await hydrateUser(c.env.DB, row);
  const posts = await count(c.env.DB, `SELECT COUNT(*) AS n FROM posts WHERE author_id = ? AND status = 'active'`, user.id);
  return c.json({
    user: { ...publicUser(user), postCount: posts },
    postCount: posts,
  });
});

export { auth, attachUser };
