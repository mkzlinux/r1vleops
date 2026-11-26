import { describe, expect, it } from "vitest";
import { hitRateLimit } from "@/server/rateLimit";
import { sqliteClient } from "./helpers";

describe("rate limit", () => {
  it("allows up to the limit per window, then blocks, then resets next window", async () => {
    const sql = sqliteClient();
    const at = (iso: string) => new Date(iso);
    const opts = { limit: 3, windowMs: 60_000 };
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await hitRateLimit(sql, "order:1.2.3.4", opts, at("2026-11-26T10:00:10Z")));
    expect(results).toEqual([true, true, true, false]);
    expect(await hitRateLimit(sql, "order:5.6.7.8", opts, at("2026-11-26T10:00:20Z"))).toBe(true);
    expect(await hitRateLimit(sql, "order:1.2.3.4", opts, at("2026-11-26T10:01:05Z"))).toBe(true);
  });
});
