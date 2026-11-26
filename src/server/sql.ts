import "server-only";

export type SqlValue = string | number | null;

/** Minimal SQL interface: D1 over HTTP in production, node:sqlite in tests. */
export interface SqlClient {
  query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
}

interface D1Response {
  readonly success: boolean;
  readonly errors?: readonly { message: string }[];
  readonly result?: readonly { results?: unknown[]; success: boolean }[];
}

/** Cloudflare D1 via the REST API (server-side only: uses an API token). */
export function d1HttpClient(opts: { accountId: string; databaseId: string; apiToken: string; apiBase?: string }): SqlClient {
  const url = `${opts.apiBase ?? "https://api.cloudflare.com/client/v4"}/accounts/${opts.accountId}/d1/database/${opts.databaseId}/query`;
  return {
    async query<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sql, params }),
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({ success: false }))) as D1Response;
      if (!res.ok || !body.success) {
        const msg = body.errors?.map((e) => e.message).join("; ") || `D1 request failed (${res.status})`;
        throw new Error(msg);
      }
      return (body.result?.[0]?.results ?? []) as T[];
    },
  };
}
