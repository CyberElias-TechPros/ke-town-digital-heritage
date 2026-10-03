/**
 * Middleware: auth resolution, role gating, KV-backed rate limiting,
 * request analytics. Written as plain Hono middleware.
 */
import type { Context, Next } from 'hono';
import { verifyJwt } from './lib/jwt';
import { loadUser } from './lib/users';
import { forbidden, tooMany, unauthorized } from './lib/http';
import type { AuthUser, Env, AppEnv } from './types';

export const jwtSecret = (env: Env): string => {
  const s = env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('JWT_SECRET is not set or too short. Configure it with `wrangler secret put JWT_SECRET`.');
  }
  return s;
};

export async function attachUser(c: Context<AppEnv>, next: Next): Promise<void> {
  const env = c.env;
  const header = c.req.header('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (token) {
    const payload = await verifyJwt(jwtSecret(c.env), token);
    if (payload?.sub) {
      const user = await loadUser(c.env.DB, String(payload.sub));
      if (user && user.accountStatus === 'active') c.set('user', user);
    }
  }
  await next();
}

/** Rejects the request unless a valid bearer token resolved to an active user. */
export async function requireAuth(c: Context<AppEnv>): Promise<AuthUser> {
  const user = c.get('user') as AuthUser | undefined;
  if (!user) throw unauthorized();
  return user;
}

const ADMIN_ROLES = new Set(['admin']);
const STAFF_ROLES = new Set(['admin', 'moderator', 'content_manager', 'seller_manager']);

export function requireAdmin(c: Context<AppEnv>): AuthUser {
  const user = c.get('user') as AuthUser | undefined;
  if (!user) throw unauthorized();
  if (!ADMIN_ROLES.has(user.role)) throw forbidden('Administrator access required');
  return user;
}

export function requireStaff(c: Context<AppEnv>): AuthUser {
  const user = c.get('user') as AuthUser | undefined;
  if (!user) throw unauthorized();
  if (!STAFF_ROLES.has(user.role)) throw forbidden('Staff access required');
  return user;
}

export function isStaff(user: { role: string } | null | undefined): boolean {
  return !!user && STAFF_ROLES.has(user.role);
}

/**
 * Sliding-window rate limiter on KV. Buckets are per IP + route class so a
 * chatty client on one endpoint cannot starve the rest of the app.
 */
/**
 * Sliding-window rate limiter on KV. Buckets are per IP + route class so a
 * chatty client on one endpoint cannot starve the rest of the app.
 *
 * `RATE_LIMIT_DISABLED=1` (set in .dev.vars for local runs) turns the guard
 * off so the end-to-end suite can be re-run back to back; production keeps
 * the defaults, which are what stop credential-stuffing on /auth/login.
 */
export async function rateLimit(
  c: Context<AppEnv>,
  bucket: string,
  max: number,
  windowSeconds = 60,
): Promise<void> {
  if (c.env.RATE_LIMIT_DISABLED === '1') return;
  const multiplier = Math.max(1, Number(c.env.RATE_LIMIT_MULTIPLIER ?? 1) || 1);
  const limit = Math.round(max * multiplier);
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local';
  const key = `rl:${bucket}:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  try {
    const raw = await c.env.CACHE.get(key);
    const state = raw ? (JSON.parse(raw) as { w: number; n: number }) : { w: windowStart, n: 0 };
    if (state.w !== windowStart) {
      state.w = windowStart;
      state.n = 0;
    }
    state.n += 1;
    if (state.n > limit) {
      throw tooMany(`Too many requests. Try again in ${windowStart + windowSeconds - now}s.`);
    }
    await c.env.CACHE.put(key, JSON.stringify(state), { expirationTtl: windowSeconds * 2 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Too many requests')) throw err;
    // KV unavailable — fail open rather than taking the whole API down.
  }
}
