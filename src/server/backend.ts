import "server-only";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { r2Client, r2SecretFromToken } from "./r2";
import { hitRateLimit, type RateLimitOptions } from "./rateLimit";
import { d1HttpClient, type SqlClient } from "./sql";
import { EVM_CHAIN_IDS, USDC_CHAINS, USDC_CHAIN_IDS, type UsdcChain } from "@/lib/payments";
import { createPaymentService, type PaymentService } from "./paymentService";
import { paynowClient } from "./paynow";
import { StoreError, createSqlStore, type SqlStore } from "./sqlStore";

/** Required server env for the Cloudflare backend. Values never reach the browser. */
function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new BackendNotConfigured(name);
  return v;
}

export class BackendNotConfigured extends Error {
  constructor(name: string) { super(`Server is missing ${name}.`); }
}
export class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

interface Backend { sql: SqlClient; store: SqlStore; r2: ReturnType<typeof r2Client>; payments: PaymentService }
let backend: Promise<Backend> | null = null;

export function getBackend(): Promise<Backend> {
  backend ??= (async () => {
    const accountId = env("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = env("CLOUDFLARE_API_TOKEN");
    const sql = d1HttpClient({ accountId, databaseId: env("CLOUDFLARE_D1_DATABASE_ID"), apiToken, apiBase: process.env.CLOUDFLARE_API_BASE });
    const r2 = r2Client({ accountId, bucket: process.env.R2_BUCKET || "r1vleops-order-files", accessKeyId: env("CLOUDFLARE_API_TOKEN_ID"), secretAccessKey: await r2SecretFromToken(apiToken) });
    const store = createSqlStore(sql, { blobs: r2.blobs });
    return { sql, r2, store, payments: paymentServiceFor(store) };
  })().catch((err: unknown) => { backend = null; throw err; });
  return backend;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function rateLimit(bucket: string, opts: RateLimitOptions): Promise<void> {
  const { sql } = await getBackend();
  if (!(await hitRateLimit(sql, `${bucket}:${await clientIp()}`, opts))) throw new HttpError(429, "Too many requests. Please wait a minute and try again.");
}

export async function requireOperator(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(process.env.OPS_SESSION_SECRET ?? "", token, new Date()))) throw new HttpError(401, "Sign in to continue.");
}

/** Same-origin check for state-changing requests (CSRF defence alongside SameSite cookies). */
export async function requireSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Cross-site request blocked.");
}

export async function readJson<T>(req: Request, maxBytes = 64_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request too large.");
  try { return JSON.parse(text) as T; } catch { throw new HttpError(400, "Invalid JSON."); }
}

/** Wraps a route handler: consistent { data } / { error } envelope, no internal details leaked. */
export async function respond<T>(fn: () => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    return NextResponse.json({ data: await fn() }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof BackendNotConfigured) {
      console.error(err.message);
      return NextResponse.json({ error: "Ordering is temporarily unavailable. Please message us on WhatsApp." }, { status: 503 });
    }
    if (err instanceof StoreError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("API error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ADDRESS_FORMAT: Record<"evm" | "solana" | "stellar" | "xrpl", RegExp> = {
  evm: EVM_ADDRESS,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  stellar: /^G[A-Z2-7]{55}$/,
  xrpl: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
};
const envName = (chain: UsdcChain) => `USDC_WALLET_${chain.toUpperCase()}`;

/**
 * Receiving wallets. USDC_WALLET_EVM is used on every EVM network listed in USDC_EVM_CHAINS
 * (default: all); USDC_WALLET_<CHAIN> overrides one network. Invalid addresses disable that network.
 */
function usdcWallets(): Partial<Record<UsdcChain, string>> {
  const evmDefault = process.env.USDC_WALLET_EVM?.trim();
  const enabledEvm = (process.env.USDC_EVM_CHAINS?.split(",").map((x) => x.trim().toLowerCase()) ?? EVM_CHAIN_IDS) as string[];
  const out: Partial<Record<UsdcChain, string>> = {};
  for (const chain of USDC_CHAIN_IDS) {
    const kind = USDC_CHAINS[chain].kind;
    const value = process.env[envName(chain)]?.trim() || (kind === "evm" && enabledEvm.includes(chain) ? evmDefault : undefined);
    if (!value) continue;
    if (!ADDRESS_FORMAT[kind].test(value)) { console.error(`${envName(chain)} is not a valid ${kind} address; ${chain} disabled.`); continue; }
    out[chain] = value;
  }
  return out;
}

/** Paynow and USDC are each enabled only when their settings are present. */
function paymentServiceFor(store: SqlStore): PaymentService {
  const id = process.env.PAYNOW_INTEGRATION_ID?.trim();
  const key = process.env.PAYNOW_INTEGRATION_KEY?.trim();
  return createPaymentService({
    store,
    siteUrl: (process.env.SITE_URL || "https://r1vleops.vercel.app").replace(/\/$/, ""),
    paynow: id && key ? paynowClient({ integrationId: id, integrationKey: key }) : null,
    paynowTestEmail: process.env.PAYNOW_MODE === "test" ? process.env.PAYNOW_TEST_EMAIL?.trim() || null : null,
    wallets: usdcWallets(),
    rpc: Object.fromEntries(USDC_CHAIN_IDS.map((c) => [c, process.env[`USDC_RPC_${c.toUpperCase()}`] ?? ""])),
  });
}
