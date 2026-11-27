import { COMPANY, maxQtyFor } from "./catalog";
import { unitPrice } from "./pricing";
import type { NewOrderInput, Order, OrderLine, ProjectUpdate, Service, Stage } from "./types";

/** Alphabet without 0/O/1/I to keep codes readable over WhatsApp or phone. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^R1V-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const INVOICE_PREFIX = "R1VLE-INV-";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 9;

export type RandomSource = () => number;

export const STAGE_LABELS: Readonly<Record<Stage, string>> = {
  awaiting_deposit: `Awaiting ${COMPANY.depositPct}% deposit`,
  deposit_confirmed: "Deposit confirmed",
  in_progress: "In progress",
  in_review: "Client review",
  delivered: "Delivered",
  closed: "Closed · paid in full",
};

export function stageLabel(stage: Stage): string {
  return STAGE_LABELS[stage];
}

function randomBlock(random: RandomSource): string {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return out;
}

export function generateTrackingCode(random: RandomSource): string {
  return `R1V-${randomBlock(random)}-${randomBlock(random)}`;
}

export function normalizeTrackingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidTrackingCode(code: string): boolean {
  return CODE_PATTERN.test(normalizeTrackingCode(code));
}

export function nextInvoiceNo(existing: readonly string[], year: number): string {
  const yearPrefix = `${INVOICE_PREFIX}${year}-`;
  const highest = existing
    .filter((no) => no.startsWith(yearPrefix))
    .map((no) => Number.parseInt(no.slice(yearPrefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${yearPrefix}${String(highest + 1).padStart(3, "0")}`;
}

export interface OrderTotals {
  readonly total: number;
  readonly deposit: number;
  readonly balance: number;
}

export const roundCents = (n: number): number => Math.round(n * 100) / 100;

export function linesTotal(lines: readonly OrderLine[]): number {
  return roundCents(lines.reduce((sum, l) => sum + l.qty * l.rateUsd, 0));
}

export function orderTotals(order: Pick<Order, "lines" | "depositPct">): OrderTotals {
  const total = linesTotal(order.lines);
  const deposit = roundCents((total * order.depositPct) / 100);
  return { total, deposit, balance: roundCents(total - deposit) };
}

export function validateNewOrder(input: NewOrderInput): string[] {
  const errors: string[] = [];
  const { client } = input;
  if (client.name.trim().length < 2) errors.push("Please enter your name.");
  if (!EMAIL_PATTERN.test(client.email.trim())) errors.push("Please enter a valid email address.");
  if (client.whatsapp.replace(/\D/g, "").length < MIN_PHONE_DIGITS) {
    errors.push("Please enter a WhatsApp number with country code.");
  }
  if (input.items.length === 0) errors.push("Pick at least one service.");
  if (input.items.length > 30) errors.push("Too many different items in one order (30 max).");
  if (input.items.some((i) => !Number.isInteger(i.qty) || i.qty < 1)) errors.push("Every item needs a quantity of at least 1.");
  if (input.brief.length > 4000) errors.push("Project brief is too long (4000 characters max).");
  return errors;
}

export interface BuildOrderDeps {
  readonly services: readonly Service[];
  readonly existingInvoiceNos: readonly string[];
  readonly now: Date;
  readonly random: RandomSource;
}

export function buildOrder(input: NewOrderInput, deps: BuildOrderDeps): Order {
  const picked = input.items.map((item) => {
    const svc = deps.services.find((s) => s.id === item.serviceId);
    if (!svc) throw new Error(`Unknown service: ${item.serviceId}`);
    const qty = Math.min(maxQtyFor(svc), Math.max(1, Math.floor(item.qty)));
    return { svc, qty };
  });
  if (picked.length === 0) throw new Error("An order needs at least one service.");

  const lines: OrderLine[] = picked.map(({ svc, qty }) => ({ serviceId: svc.id, name: svc.name, qty, rateUsd: unitPrice(svc, input.region, qty) }));
  const at = deps.now.toISOString();
  const invoiceNo = nextInvoiceNo(deps.existingInvoiceNos, deps.now.getFullYear());
  const firstUpdate: ProjectUpdate = {
    at,
    stage: "awaiting_deposit",
    progress: 0,
    note: `Order received. Invoice ${invoiceNo} issued; work starts once the ${COMPANY.depositPct}% deposit is confirmed.`,
  };

  return {
    id: `ord_${deps.now.getTime().toString(36)}${randomBlock(deps.random).toLowerCase()}`,
    trackingCode: generateTrackingCode(deps.random),
    invoiceNo,
    createdAt: at,
    departmentId: picked[0].svc.departmentId,
    client: {
      name: input.client.name.trim(),
      company: input.client.company.trim(),
      email: input.client.email.trim(),
      whatsapp: input.client.whatsapp.trim(),
    },
    brief: input.brief.trim(),
    lines,
    depositPct: COMPANY.depositPct,
    stage: "awaiting_deposit",
    progress: 0,
    assignedWorkerId: null,
    updates: [firstUpdate],
    region: input.region,
    country: input.country ?? null,
  };
}

export interface OrderAdvance {
  readonly stage: Stage;
  readonly progress: number;
  readonly note: string;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Returns a new order with the stage/progress applied and the update logged. */
export function advanceOrder(order: Order, change: OrderAdvance, now: Date): Order {
  const forcedFull = change.stage === "delivered" || change.stage === "closed";
  const progress = forcedFull ? 100 : clamp(Math.round(change.progress), 0, 100);
  const update: ProjectUpdate = {
    at: now.toISOString(),
    stage: change.stage,
    progress,
    note: change.note.trim() || stageLabel(change.stage),
  };
  return { ...order, stage: change.stage, progress, updates: [...order.updates, update] };
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
