import { DEPARTMENTS } from "@/lib/catalog";
import type { OrderAdvance } from "@/lib/orders";
import { STAGES, type DepartmentId, type NewOrderInput, type NewWorkerInput, type Region, type Stage } from "@/lib/types";
import { PAYNOW_CHANNELS, USDC_CHAIN_IDS, type PaymentKind, type PaynowChannel, type UsdcChain } from "@/lib/payments";
import type { CustomRequest, QuoteRequest, QuoteResponse } from "@/lib/quotes";
import { SIGNABLE_KINDS, TECHNIQUE_IDS, type SignRequest, type SignableKind, type TechniqueId } from "@/lib/agreements";
import type { StartPayment } from "./paymentService";
import { StoreError, type FileMeta } from "./sqlStore";

/** Shape checks for untrusted JSON at the API boundary. Business rules run afterwards in the store. */
type Obj = Record<string, unknown>;
const fail = (what: string): never => { throw new StoreError(`Invalid ${what}.`); };
const obj = (v: unknown, what: string): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : fail(what));
const str = (v: unknown, what: string, max: number): string => (typeof v === "string" && v.length <= max ? v : fail(what));
const optStr = (v: unknown, what: string, max: number): string => (v === undefined || v === null ? "" : str(v, what, max));
const num = (v: unknown, what: string): number => (typeof v === "number" && Number.isFinite(v) ? v : fail(what));
const oneOf = <T extends string>(v: unknown, options: readonly T[], what: string): T => (options.includes(v as T) ? (v as T) : fail(what));
const DEPT_IDS: readonly DepartmentId[] = DEPARTMENTS.map((d) => d.id);
const REGIONS: readonly Region[] = ["zw", "intl"];

export function parseNewOrder(body: unknown): NewOrderInput {
  const b = obj(body, "order");
  const c = obj(b.client, "client details");
  const items = Array.isArray(b.items) && b.items.length <= 30 ? b.items : fail("items");
  return {
    client: { name: str(c.name, "name", 120), company: optStr(c.company, "company", 160), email: str(c.email, "email", 200), whatsapp: str(c.whatsapp, "WhatsApp number", 40) },
    brief: optStr(b.brief, "brief", 4000),
    items: items.map((raw) => { const i = obj(raw, "item"); return { serviceId: str(i.serviceId, "item", 60), qty: num(i.qty, "quantity") }; }),
    region: oneOf(b.region, REGIONS, "price region"),
  };
}

export function parseAdvance(body: unknown): OrderAdvance {
  const b = obj(body, "update");
  return { stage: oneOf<Stage>(b.stage, STAGES, "stage"), progress: num(b.progress, "progress"), note: optStr(b.note, "note", 1000) };
}

export function parseNewWorker(body: unknown): NewWorkerInput {
  const b = obj(body, "employee");
  return { name: str(b.name, "name", 120), role: str(b.role, "role", 120), departmentId: oneOf(b.departmentId, DEPT_IDS, "department"), email: optStr(b.email, "email", 200) };
}

export function parseFileMetas(body: unknown): FileMeta[] {
  const list = obj(body, "files").files;
  if (!Array.isArray(list) || list.length === 0 || list.length > 10) return fail("file list");
  return list.map((raw) => {
    const f = obj(raw, "file");
    const size = num(f.size, "file size");
    if (size < 0) fail("file size");
    return { name: str(f.name, "file name", 255), type: optStr(f.type, "file type", 120), size };
  });
}

const KINDS: readonly PaymentKind[] = ["deposit", "balance"];
const PAYNOW_IDS: readonly PaynowChannel[] = PAYNOW_CHANNELS.map((c) => c.id);

export function parseStartPayment(body: unknown): StartPayment {
  const b = obj(body, "payment");
  const kind = oneOf(b.kind, KINDS, "payment type");
  if (b.method === "paynow") return { kind, method: "paynow", channel: oneOf(b.channel, PAYNOW_IDS, "payment option"), phone: optStr(b.phone, "phone number", 30) };
  if (b.method === "usdc") return { kind, method: "usdc", channel: oneOf<UsdcChain>(b.channel, USDC_CHAIN_IDS, "USDC network") };
  return fail("payment method");
}

export function parseQuoteRequest(body: unknown): QuoteRequest {
  const b = obj(body, "request");
  const base = parseNewOrder({ client: b.client, brief: "", items: b.items, region: b.region });
  return { client: base.client, items: base.items, region: base.region, proposedTotal: num(b.proposedTotal, "budget"), note: optStr(b.note, "note", 2000) };
}

export function parseQuoteResponse(body: unknown): QuoteResponse {
  const b = obj(body, "response");
  const message = optStr(b.message, "message", 2000);
  if (b.action === "accept") return { action: "accept", message };
  if (b.action === "decline") return { action: "decline", message };
  if (b.action === "counter") return { action: "counter", amount: num(b.amount, "amount"), message };
  return fail("action");
}

/** Operator dashboard: invoice or offer for a client, with the price list chosen by the operator. */
export function parseOperatorDraft(body: unknown): { input: NewOrderInput; agreedTotal: number | null; message: string } {
  const b = obj(body, "draft");
  const input = parseNewOrder({ client: b.client, brief: b.brief ?? "", items: b.items, region: b.region });
  const agreedTotal = b.agreedTotal === null || b.agreedTotal === undefined || b.agreedTotal === "" ? null : num(b.agreedTotal, "agreed total");
  return { input, agreedTotal, message: optStr(b.message, "message", 2000) };
}

export function parseCustomRequest(body: unknown): Omit<CustomRequest, "region"> {
  const b = obj(body, "request");
  const c = obj(b.client, "client details");
  const budget = b.budget === null || b.budget === undefined || b.budget === "" ? null : num(b.budget, "budget");
  return {
    client: { name: str(c.name, "name", 120), company: optStr(c.company, "company", 160), email: str(c.email, "email", 200), whatsapp: str(c.whatsapp, "WhatsApp number", 40) },
    title: str(b.title, "title", 120),
    description: str(b.description, "description", 4000),
    departmentId: oneOf(b.departmentId, DEPT_IDS, "department"),
    budget,
    timeline: optStr(b.timeline, "timeline", 120),
  };
}

/** NDA / Authorization to Test signing form. Business rules (matching signature, dates) run in the store. */
export function parseSignRequest(body: unknown): SignRequest {
  const b = obj(body, "agreement");
  const s = obj(b.signer, "signer");
  const kind = oneOf<SignableKind>(b.kind, SIGNABLE_KINDS, "agreement type");
  const f = b.fields === undefined ? {} : obj(b.fields, "agreement details");
  const signer = { name: str(s.name, "name", 120), email: str(s.email, "email", 200), company: optStr(s.company, "company", 160), role: optStr(s.role, "role", 120) };
  const fields = kind === "nda"
    ? { purpose: optStr(f.purpose, "purpose", 1000) }
    : {
      inScope: str(f.inScope, "scope", 4000),
      outOfScope: optStr(f.outOfScope, "out-of-scope list", 2000),
      windowStart: str(f.windowStart, "start date", 10),
      windowEnd: str(f.windowEnd, "end date", 10),
      techniques: Array.isArray(f.techniques) && f.techniques.length <= TECHNIQUE_IDS.length
        ? f.techniques.map((t) => oneOf<TechniqueId>(t, TECHNIQUE_IDS, "testing technique"))
        : fail("testing techniques"),
      emergencyName: str(f.emergencyName, "emergency contact", 120),
      emergencyPhone: str(f.emergencyPhone, "emergency phone", 40),
    };
  const refCode = b.refCode === undefined || b.refCode === null || b.refCode === "" ? null : str(b.refCode, "order code", 20);
  return { kind, signer, fields, signature: str(b.signature, "signature", 120), consent: b.consent === true, refCode };
}

/** Public checkout and ticket forms must send acceptTerms: true. */
export function requireTermsAccepted(body: unknown): void {
  if (!body || typeof body !== "object" || (body as Obj).acceptTerms !== true) throw new StoreError("Please accept the Terms and Conditions to continue.");
}
