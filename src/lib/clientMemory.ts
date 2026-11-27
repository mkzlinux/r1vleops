import { normalizeTrackingCode } from "./orders";
import type { Client } from "./types";

/**
 * Per-device convenience only (no accounts): remembers the client's details for checkout and the
 * tracking codes they've used, so returning clients don't retype them. Real records live in the
 * database, keyed by email. Every read/write is guarded: storage can be unavailable.
 */
const KEY = "r1vle-client-v1";
const MAX_CODES = 30;

export interface ClientMemory {
  readonly client: Client | null;
  readonly codes: readonly string[];
}

const EMPTY: ClientMemory = { client: null, codes: [] };

export function readClientMemory(): ClientMemory {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ClientMemory>;
    const c = parsed.client;
    const client = c && typeof c.email === "string" && typeof c.name === "string"
      ? { name: c.name, company: String(c.company ?? ""), email: c.email, whatsapp: String(c.whatsapp ?? "") }
      : null;
    const codes = Array.isArray(parsed.codes) ? parsed.codes.filter((x): x is string => typeof x === "string").slice(0, MAX_CODES) : [];
    return { client, codes };
  } catch {
    return EMPTY;
  }
}

function write(next: ClientMemory): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: fine */ }
}

export function rememberClient(client: Client, code?: string): void {
  const prev = readClientMemory();
  const codes = code ? [normalizeTrackingCode(code), ...prev.codes.filter((c) => c !== normalizeTrackingCode(code))].slice(0, MAX_CODES) : prev.codes;
  write({ client, codes });
}

export function rememberCode(code: string): void {
  const prev = readClientMemory();
  const c = normalizeTrackingCode(code);
  write({ ...prev, codes: [c, ...prev.codes.filter((x) => x !== c)].slice(0, MAX_CODES) });
}

export function forgetClient(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
