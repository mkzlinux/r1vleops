import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { SqlClient, SqlValue } from "@/server/sql";

/** Real SQLite in memory with the production D1 schema, behind the same SqlClient interface. */
export function sqliteClient(): SqlClient {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("cloudflare/schema.sql", "utf8"));
  return {
    async query<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
      const stmt = db.prepare(sql);
      if (/^\s*(select|with)\b/i.test(sql) || /\breturning\b/i.test(sql)) return stmt.all(...params) as T[];
      stmt.run(...params);
      return [];
    },
  };
}
