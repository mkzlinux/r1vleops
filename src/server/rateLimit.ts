import type { SqlClient } from "./sql";

export interface RateLimitOptions { readonly limit: number; readonly windowMs: number }

/** Fixed-window counter in D1. Returns true when the request is allowed. */
export async function hitRateLimit(sql: SqlClient, key: string, opts: RateLimitOptions, now: Date = new Date()): Promise<boolean> {
  const windowStart = Math.floor(now.getTime() / opts.windowMs) * opts.windowMs;
  const [row] = await sql.query<{ count: number }>(
    "INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1 RETURNING count",
    [key, windowStart],
  );
  if (Math.random() < 0.02) await sql.query("DELETE FROM rate_limits WHERE window_start < ?", [windowStart - opts.windowMs]);
  return (row?.count ?? 1) <= opts.limit;
}
