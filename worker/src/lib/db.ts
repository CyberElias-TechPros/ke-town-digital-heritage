/**
 * Thin D1 helpers. Every row read goes through `all` / `first` / `run`
 * so that parameter binding is always positional and safe.
 */

type Bind = string | number | null | boolean | Uint8Array;

export async function all<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: Bind[]
): Promise<T[]> {
  const { results } = await db.prepare(sql).bind(...(params as never[])).all<T>();
  return results ?? [];
}

export async function first<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: Bind[]
): Promise<T | null> {
  const row = await db.prepare(sql).bind(...(params as never[])).first<T>();
  return row ?? null;
}

export async function run(db: D1Database, sql: string, ...params: Bind[]): Promise<void> {
  await db.prepare(sql).bind(...(params as never[])).run();
}

export async function count(db: D1Database, sql: string, ...params: Bind[]): Promise<number> {
  const row = await first<{ n: number }>(db, sql, ...params);
  return Number(row?.n ?? 0);
}

/** Run several statements atomically. */
export async function batch(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  if (statements.length) await db.batch(statements);
}

export function stmt(db: D1Database, sql: string, ...params: Bind[]): D1PreparedStatement {
  return db.prepare(sql).bind(...(params as never[]));
}
