import { priceBucket } from "./bucket";
import { normalizeTrackingCode, roundCents } from "./orders";
import type { Client, OrderItem, OrderLine, Region, Service } from "./types";

/**
 * Negotiation tickets ("quotes"): a client proposes a budget for their bucket before checkout,
 * the operator accepts, counters or declines, and an agreed price checks out as a normal order
 * with a "Negotiated price" discount line.
 */
export type QuoteStatus = "open" | "countered" | "accepted" | "declined" | "converted";

export interface QuoteRequest {
  readonly client: Client;
  readonly items: readonly OrderItem[];
  readonly region: Region;
  readonly proposedTotal: number;
  readonly note: string;
}

export interface Quote {
  readonly id: string;
  readonly code: string;
  readonly createdAt: string;
  readonly client: Client;
  readonly region: Region;
  readonly items: readonly OrderItem[];
  readonly lines: readonly OrderLine[];
  readonly listTotal: number;
  readonly proposedTotal: number;
  readonly note: string;
  readonly status: QuoteStatus;
  /** Price the client can check out at (after accept/counter). */
  readonly offerTotal: number | null;
  readonly reply: string;
  readonly respondedAt: string | null;
  readonly validUntil: string | null;
  /** Tracking code of the order created from this quote. */
  readonly orderCode: string | null;
}

export type QuoteResponse =
  | { readonly action: "accept"; readonly message: string }
  | { readonly action: "counter"; readonly amount: number; readonly message: string }
  | { readonly action: "decline"; readonly message: string };

export const QUOTE_VALID_DAYS = 14;
const QUOTE_CODE = /^R1Q-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const block = (random: () => number) => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join("");
export const generateQuoteCode = (random: () => number): string => `R1Q-${block(random)}-${block(random)}`;
export const isValidQuoteCode = (code: string): boolean => QUOTE_CODE.test(normalizeTrackingCode(code));

export function validateQuoteRequest(r: QuoteRequest, listTotal: number): string[] {
  const errors: string[] = [];
  if (r.client.name.trim().length < 2) errors.push("Please enter your name.");
  if (!EMAIL_PATTERN.test(r.client.email.trim())) errors.push("Please enter a valid email address.");
  if (r.client.whatsapp.replace(/\D/g, "").length < 9) errors.push("Please enter a WhatsApp number with country code.");
  if (r.items.length === 0) errors.push("Add at least one item to your bucket first.");
  if (r.items.length > 30) errors.push("Too many different items (30 max).");
  if (!Number.isFinite(r.proposedTotal) || r.proposedTotal <= 0) errors.push("Enter the budget you have in mind.");
  else if (listTotal > 0 && r.proposedTotal >= listTotal) errors.push("Your budget should be less than the listed total; otherwise just check out.");
  if (r.note.length > 2000) errors.push("Note is too long (2000 characters max).");
  return errors;
}

export function buildQuote(r: QuoteRequest, deps: { services: readonly Service[]; now: Date; random: () => number }): Quote {
  const priced = priceBucket(r.items, deps.services, r.region);
  const errors = validateQuoteRequest(r, priced.total);
  if (errors.length > 0) throw new Error(errors.join(" "));
  return {
    id: `q_${deps.now.getTime().toString(36)}${Math.floor(deps.random() * 1e6).toString(36)}`,
    code: generateQuoteCode(deps.random),
    createdAt: deps.now.toISOString(),
    client: { name: r.client.name.trim(), company: r.client.company.trim(), email: r.client.email.trim(), whatsapp: r.client.whatsapp.trim() },
    region: r.region,
    items: priced.lines.map((l) => ({ serviceId: l.service.id, qty: l.qty })),
    lines: priced.lines.map((l) => ({ serviceId: l.service.id, name: l.service.name, qty: l.qty, rateUsd: l.unitUsd })),
    listTotal: priced.total,
    proposedTotal: roundCents(r.proposedTotal),
    note: r.note.trim(),
    status: "open",
    offerTotal: null,
    reply: "",
    respondedAt: null,
    validUntil: null,
    orderCode: null,
  };
}

export function respondToQuote(q: Quote, r: QuoteResponse, now: Date): Quote {
  if (q.status === "converted") throw new Error("This quote has already been checked out.");
  const validUntil = new Date(now.getTime() + QUOTE_VALID_DAYS * 86_400_000).toISOString();
  const base = { ...q, reply: r.message.trim().slice(0, 2000), respondedAt: now.toISOString() };
  if (r.action === "decline") return { ...base, status: "declined", offerTotal: null, validUntil: null };
  if (r.action === "accept") return { ...base, status: "accepted", offerTotal: q.proposedTotal, validUntil };
  if (!Number.isFinite(r.amount) || r.amount <= 0) throw new Error("Enter a counter-offer amount.");
  if (r.amount >= q.listTotal) throw new Error("A counter-offer should be below the list price.");
  return { ...base, status: "countered", offerTotal: roundCents(r.amount), validUntil };
}

export function canCheckoutQuote(q: Quote, now: Date): boolean {
  return (q.status === "accepted" || q.status === "countered") && q.offerTotal !== null && !!q.validUntil && now.getTime() <= new Date(q.validUntil).getTime();
}

/** Negative line taking `listTotal` down to `target` (null when nothing to take off). */
export function adjustmentLine(listTotal: number, target: number, label: string): OrderLine | null {
  if (!Number.isFinite(target) || target <= 0) throw new Error("Enter an agreed total above zero.");
  const diff = roundCents(listTotal - target);
  return diff > 0 ? { serviceId: "price-adjustment", name: label, qty: 1, rateUsd: -diff } : null;
}

/** Discount that brings today's list total down to the agreed price (none if prices have since dropped below it). */
export function discountLine(q: Quote, currentListTotal: number): OrderLine | null {
  if (q.offerTotal === null) return null;
  const diff = roundCents(currentListTotal - q.offerTotal);
  return diff > 0 ? { serviceId: "negotiated-discount", name: `Negotiated price (${q.code})`, qty: 1, rateUsd: -diff } : null;
}

export interface OfferInput {
  readonly client: Client;
  readonly items: readonly OrderItem[];
  readonly region: Region;
  readonly note: string;
}

/**
 * An offer made by the operator from the dashboard: same shape as a negotiation ticket, but it
 * starts "accepted" at the chosen price (or the list price), so the client only has to accept.
 */
export function buildOffer(input: OfferInput, terms: { offerTotal: number | null; message: string }, deps: { services: readonly Service[]; now: Date; random: () => number }): Quote {
  const priced = priceBucket(input.items, deps.services, input.region);
  if (priced.lines.length === 0) throw new Error("Add at least one item.");
  const offer = terms.offerTotal ?? priced.total;
  if (!Number.isFinite(offer) || offer <= 0) throw new Error("Enter an offer above zero.");
  if (offer > priced.total) throw new Error("The offer can't be above the list price.");
  const base = buildQuote({ ...input, proposedTotal: Math.min(offer, priced.total - 0.01) }, deps);
  return respondToQuote({ ...base, proposedTotal: roundCents(offer) }, { action: "accept", message: terms.message }, deps.now);
}
