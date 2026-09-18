/**
 * Crypto primitives that work on the Workers runtime (WebCrypto only —
 * no Node `crypto`, no bcrypt native module).
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/** URL-safe, collision-resistant identifier (timestamp-prefixed ULID-ish). */
export function newId(prefix = ''): string {
  const t = Date.now().toString(36).padStart(9, '0');
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let rand = '';
  for (const b of bytes) rand += b.toString(36).padStart(2, '0');
  return `${prefix}${t}${rand.slice(0, 16)}`;
}

export function randomHex(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomRef(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomHex(4)}`.toUpperCase();
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const PBKDF2_ITERATIONS = 100_000;

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return b64(bits);
}

/** Hash a password. Format: `pbkdf2$<iterations>$<saltB64>$<hashB64>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = Number(iterStr);
    const salt = unb64(saltB64);
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      key,
      256,
    );
    const candidate = b64(bits);
    if (candidate.length !== hashB64.length) return false;
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) {
      diff |= candidate.charCodeAt(i) ^ hashB64.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export { b64, unb64, enc, dec };
