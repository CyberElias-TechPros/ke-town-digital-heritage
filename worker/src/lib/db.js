// D1 helpers: id generation, JSON encoding/decoding, and row normalization.
// D1 binding is provided via the `env` parameter from the Worker entry.

/** Generate a unique 128-bit id string (hex, no dashes). */
export function newId() {
  return crypto.randomUUID().replace(/-/g, "");
}

/** Current Unix epoch milliseconds. */
export function now() {
  return Date.now();
}

/** Encode a value to a JSON string for TEXT columns (safe for undefined). */
export function json(v) {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

/** Parse a JSON TEXT column; returns fallback on invalid/empty. */
export function unjson(v, fallback = null) {
  if (v === null || v === undefined || v === "") return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

/** Strip undefined fields from an object (SQLite D1 rejects undefined). */
export function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Execute a query with bindings on the D1 database.
 */
export async function run(env, sql, ...bindings) {
  return env.DB.prepare(sql).bind(...bindings).run();
}

/** Fetch rows. */
export async function all(env, sql, ...bindings) {
  const res = await env.DB.prepare(sql).bind(...bindings).all();
  return res.results || [];
}

/** Fetch first row or null. */
export async function first(env, sql, ...bindings) {
  return env.DB.prepare(sql).bind(...bindings).first();
}

/**
 * Run a batch of statements in a transaction.
 * statements: array of { sql, bindings? }
 */
export async function batch(env, statements) {
  return env.DB.batch(
    statements.map((s) => env.DB.prepare(s.sql).bind(...(s.bindings || [])))
  );
}
