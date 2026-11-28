import { describe, expect, test } from "vitest";
import nextConfig from "../next.config";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

type Header = { key: string; value: string };

async function headersFor(path: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const out: Record<string, string> = {};
  for (const r of rules) {
    const re = new RegExp(`^${r.source.replace(/:path\*/g, ".*").replace(/\(\.\*\)/g, ".*")}$`);
    if (re.test(path)) for (const h of r.headers as Header[]) out[h.key.toLowerCase()] = h.value;
  }
  return out;
}

describe("security headers", () => {
  test("every page gets clickjacking, sniffing, referrer, permissions and CSP protection", async () => {
    const h = await headersFor("/pricing");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toMatch(/camera=\(\)/);
    expect(h["strict-transport-security"]).toMatch(/max-age=63072000/);
    const csp = h["content-security-policy"];
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/base-uri 'self'/);
    expect(csp).toMatch(/form-action 'self'/);
    expect(csp).toMatch(/connect-src 'self' https:\/\/\*\.r2\.cloudflarestorage\.com/);
  });

  test("private areas are never indexed or cached", async () => {
    expect((await headersFor("/ops/deals"))["x-robots-tag"]).toMatch(/noindex/);
    expect((await headersFor("/invoice/R1V-AAAA-BBBB"))["x-robots-tag"]).toMatch(/noindex/);
    expect((await headersFor("/api/ops/orders"))["cache-control"]).toMatch(/no-store/);
  });
});

describe("robots.txt and sitemap.xml", () => {
  test("crawlers see public pages only", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules.disallow).toEqual(expect.arrayContaining(["/ops", "/api/", "/invoice/", "/quote/", "/orders", "/track"]));
    expect(r.sitemap).toMatch(/sitemap\.xml$/);
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toEqual(["/", "/pricing", "/request"]);
  });
});

describe("client file uploads", () => {
  test("presigned upload URLs are bound to the declared file size", async () => {
    const { r2Client } = await import("@/server/r2");
    const r2 = r2Client({ accountId: "acct", bucket: "b", accessKeyId: "AKID", secretAccessKey: "secret" });
    const url = new URL(await r2.uploadUrl("o1/0-logo.png", 12345));
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("content-length;host");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
  });
});
