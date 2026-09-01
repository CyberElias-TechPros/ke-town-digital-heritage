// Password hashing using PBKDF2 (Web Crypto) — Cloudflare-native, no Node deps.
// Format: pbkdf2$sha256$<iterations>$<saltB64>$<hashB64>

const ITERATIONS = 100000;
const KEY_LEN = 32; // 256 bits

const enc = new TextEncoder();

function bytesToB64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function salt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function derive(password, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations,
    },
    keyMaterial,
    KEY_LEN * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const s = salt();
  const hash = await derive(password, s, ITERATIONS);
  return `pbkdf2$sha256$${ITERATIONS}$${bytesToB64(s)}$${bytesToB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[2], 10);
  const s = b64ToBytes(parts[3]);
  const expected = b64ToBytes(parts[4]);
  const hash = await derive(password, s, iterations);
  if (hash.length !== expected.length) return false;
  // constant-time comparison
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ expected[i];
  return diff === 0;
}
