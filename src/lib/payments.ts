import { orderTotals } from "./orders";
import type { Order } from "./types";

/** Pure payment rules shared by the server (Paynow + on-chain USDC) and the invoice UI. */

export type PaymentKind = "deposit" | "balance";
export type PaymentMethod = "paynow" | "usdc";
export type PaynowChannel = "web" | "ecocash" | "onemoney" | "innbucks";
export type UsdcChain = "base" | "bsc" | "xrpl";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export interface Payment {
  readonly id: string;
  readonly orderId: string;
  readonly kind: PaymentKind;
  readonly method: PaymentMethod;
  /** Paynow channel or USDC chain. */
  readonly channel: PaynowChannel | UsdcChain;
  readonly amountUsd: number;
  readonly status: PaymentStatus;
  readonly createdAt: string;
  readonly paidAt: string | null;
  /** USDC: exact amount to send, e.g. "25.504321". */
  readonly payAmount: string | null;
  /** USDC: receiving wallet. */
  readonly payTo: string | null;
  /** XRPL: destination tag the client must include. */
  readonly destinationTag: number | null;
  /** Paynow reference or chain transaction hash once paid. */
  readonly proof: string | null;
}

const PAYABLE_BALANCE_STAGES: readonly Order["stage"][] = ["in_review", "delivered"];

/** Deposit before work starts; balance once work is in review or delivered. */
export function payableKinds(order: Pick<Order, "stage">): PaymentKind[] {
  if (order.stage === "awaiting_deposit") return ["deposit"];
  if (PAYABLE_BALANCE_STAGES.includes(order.stage)) return ["balance"];
  return [];
}

export function amountDue(order: Pick<Order, "lines" | "depositPct">, kind: PaymentKind): number {
  const t = orderTotals(order);
  return kind === "deposit" ? t.deposit : t.balance;
}

// ---------- Paynow ----------

export const PAYNOW_CHANNELS: readonly { id: PaynowChannel; label: string; needsPhone: boolean }[] = [
  { id: "ecocash", label: "EcoCash", needsPhone: true },
  { id: "onemoney", label: "OneMoney", needsPhone: true },
  { id: "innbucks", label: "InnBucks", needsPhone: true },
  { id: "web", label: "Card & other options", needsPhone: false },
];

const PAYNOW_PAID = new Set(["paid", "awaiting delivery", "delivered"]);
const PAYNOW_FAILED = new Set(["cancelled", "failed", "disputed", "refunded"]);
export const isPaynowPaid = (status: string): boolean => PAYNOW_PAID.has(status.trim().toLowerCase());
export const isPaynowFailed = (status: string): boolean => PAYNOW_FAILED.has(status.trim().toLowerCase());

export type FormFields = readonly (readonly [string, string])[];

/** Paynow hash: SHA-512 of every value (in order, excluding `hash`) + lowercased integration key, uppercase hex. */
export async function paynowHash(fields: FormFields, integrationKey: string): Promise<string> {
  const text = fields.filter(([k]) => k.toLowerCase() !== "hash").map(([, v]) => v).join("") + integrationKey.toLowerCase();
  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export async function verifyPaynowHash(fields: FormFields, integrationKey: string): Promise<boolean> {
  const given = fields.find(([k]) => k.toLowerCase() === "hash")?.[1];
  return !!given && given.toUpperCase() === (await paynowHash(fields, integrationKey));
}

/** Parses Paynow's url-encoded replies, keeping field order (needed for the hash). */
export function parseForm(body: string): [string, string][] {
  return body.trim().replace(/^\?/, "").split("&").filter(Boolean).map((pair) => {
    const i = pair.indexOf("=");
    const dec = (s: string) => decodeURIComponent(s.replace(/\+/g, " "));
    return i < 0 ? [dec(pair), ""] : [dec(pair.slice(0, i)), dec(pair.slice(i + 1))];
  });
}

export function toFormBody(fields: FormFields): string {
  return fields.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

export const formValue = (fields: FormFields, key: string): string | undefined =>
  fields.find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];

// ---------- USDC ----------

export interface EvmChain { readonly kind: "evm"; readonly label: string; readonly network: string; readonly token: string; readonly decimals: number; readonly explorerTx: string }
export interface XrplChain { readonly kind: "xrpl"; readonly label: string; readonly network: string; readonly issuer: string; readonly currency: string; readonly explorerTx: string }

/** USDC contracts. Base: Circle-native USDC (6 decimals). BSC: Binance-Peg USDC (18 decimals). XRPL: Circle issuer. */
export const USDC_CHAINS: { readonly base: EvmChain; readonly bsc: EvmChain; readonly xrpl: XrplChain } = {
  base: { kind: "evm", label: "Base", network: "Base mainnet", token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, explorerTx: "https://basescan.org/tx/" },
  bsc: { kind: "evm", label: "BNB Smart Chain (BEP-20)", network: "BNB Smart Chain", token: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, explorerTx: "https://bscscan.com/tx/" },
  xrpl: { kind: "xrpl", label: "XRP Ledger", network: "XRPL mainnet", issuer: "rGm7WCVp9gb4jZHWTEtGUr4dd74z2XuWhE", currency: "5553444300000000000000000000000000000000", explorerTx: "https://livenet.xrpl.org/transactions/" },
};

export const USDC_CHAIN_IDS = Object.keys(USDC_CHAINS) as UsdcChain[];
const MICRO = 1_000_000n;
const MAX_OFFSET = 9_999n; // < $0.01 extra so every pending USDC payment has a unique amount

/** Amount in USDC micro-units (6 dp) with a small unique offset so a transfer identifies its invoice. */
export function pickUsdcUnits(usd: number, taken: ReadonlySet<bigint>, random: () => number = Math.random): bigint {
  const base = BigInt(Math.round(usd * 100)) * (MICRO / 100n);
  for (let i = 0; i < 50; i += 1) {
    const offset = 1n + BigInt(Math.floor(random() * Number(MAX_OFFSET))) + BigInt(i);
    const units = base + (offset % MAX_OFFSET) + 1n;
    if (!taken.has(units)) return units;
  }
  throw new Error("Too many open USDC payments. Please try again shortly.");
}

export const unitsToUsd = (units: bigint): string => `${units / MICRO}.${(units % MICRO).toString().padStart(6, "0")}`;
export const usdToUnits = (usd: string): bigint => {
  const [whole, frac = ""] = usd.split(".");
  return BigInt(whole || "0") * MICRO + BigInt((frac + "000000").slice(0, 6));
};

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export interface EvmLog { readonly address: string; readonly topics: readonly string[]; readonly data: string; readonly transactionHash: string; readonly removed?: boolean }

/** Finds an ERC-20 Transfer of exactly `units` (6 dp, scaled to the token's decimals) to `wallet`. */
export function findEvmTransfer(logs: readonly EvmLog[], opts: { token: string; wallet: string; units: bigint; decimals: number }): string | null {
  const want = opts.units * 10n ** BigInt(opts.decimals - 6);
  const to = opts.wallet.toLowerCase().replace(/^0x/, "");
  for (const log of logs) {
    if (log.removed || log.address.toLowerCase() !== opts.token.toLowerCase()) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC || !log.topics[2]?.toLowerCase().endsWith(to)) continue;
    if (BigInt(log.data === "0x" ? 0 : log.data) === want) return log.transactionHash;
  }
  return null;
}

/** eth_getLogs topic filter: Transfer(any sender -> wallet). */
export const transferTopicsTo = (wallet: string): (string | null)[] => [TRANSFER_TOPIC, null, "0x" + wallet.toLowerCase().replace(/^0x/, "").padStart(64, "0")];

export interface XrplTx {
  readonly tx?: { TransactionType?: string; Destination?: string; DestinationTag?: number; hash?: string };
  readonly tx_json?: { TransactionType?: string; Destination?: string; DestinationTag?: number };
  readonly hash?: string;
  readonly meta?: { TransactionResult?: string; delivered_amount?: unknown };
  readonly validated?: boolean;
}

/** Finds a validated USDC payment to `wallet` with the destination tag and at least the amount due. */
export function findXrplPayment(txs: readonly XrplTx[], opts: { wallet: string; tag: number; minUsd: number }): string | null {
  const x = USDC_CHAINS.xrpl;
  for (const t of txs) {
    const tx = t.tx ?? t.tx_json;
    if (!t.validated || !tx || tx.TransactionType !== "Payment" || tx.Destination !== opts.wallet || tx.DestinationTag !== opts.tag) continue;
    if (t.meta?.TransactionResult !== "tesSUCCESS") continue;
    const amt = t.meta.delivered_amount as { currency?: string; issuer?: string; value?: string } | string | undefined;
    if (!amt || typeof amt === "string" || amt.issuer !== x.issuer || amt.currency?.toUpperCase() !== x.currency) continue;
    if (Number(amt.value) + 1e-9 >= opts.minUsd) return t.tx?.hash ?? t.hash ?? null;
  }
  return null;
}
