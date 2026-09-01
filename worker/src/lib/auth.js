// Lightweight HS256 JWT implementation using Web Crypto (Cloudflare-native).
// No external dependencies.

const enc = new TextEncoder();
const dec = new TextDecoder();

function base64UrlEncode(input) {
  // Accept string or Uint8Array
  let bytes;
  if (typeof input === "string") {
    bytes = enc.encode(input);
  } else {
    bytes = input;
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const b64 = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8Bytes(str) {
  return enc.encode(str);
}

/** Import the HMAC secret key. */
async function getKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    utf8Bytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Sign a JWT (HS256). payload is an object. */
export async function signJwt(payload, secret, expiresInSeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + (expiresInSeconds || 60 * 60 * 24 * 7),
  };
  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(body));
  const data = `${headerPart}.${payloadPart}`;
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, utf8Bytes(data));
  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Verify a JWT and return its payload, or null if invalid/expired. */
export async function verifyJwt(token, secret) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, sigPart] = parts;
  try {
    const data = `${headerPart}.${payloadPart}`;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(sigPart),
      utf8Bytes(data)
    );
    if (!valid) return null;
    const payload = JSON.parse(dec.decode(base64UrlDecode(payloadPart)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Hash a plaintext (for OTP/tokens stored in DB). */
export async function hashValue(value) {
  const digest = await crypto.subtle.digest("SHA-256", utf8Bytes(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
