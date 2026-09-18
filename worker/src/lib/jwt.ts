/**
 * Minimal HS256 JWT implementation on WebCrypto.
 * Same wire format as `jsonwebtoken` so tokens stay portable.
 */
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlEncode(str: string): string {
  return b64url(enc.encode(str));
}

function b64urlDecode(str: string): string {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  [k: string]: unknown;
}

export async function signJwt(
  secret: string,
  payload: Record<string, unknown>,
  ttlSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body: JwtPayload = { iat: now, exp: now + ttlSeconds, ...payload } as JwtPayload;
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = b64urlEncode(JSON.stringify(body));
  const data = `${header}.${claims}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyJwt(secret: string, token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, claims, sig] = parts;
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      (() => {
        const bin = atob(sig.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (sig.length % 4)) % 4));
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      })(),
      enc.encode(`${header}.${claims}`),
    );
    if (!ok) return null;
    const payload = JSON.parse(b64urlDecode(claims)) as JwtPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
