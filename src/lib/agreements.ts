import { LEGAL_DOCS, type LegalDoc } from "./legal";
import { isValidTrackingCode, normalizeTrackingCode } from "./orders";

/** Documents a client can sign on the site. "terms" is recorded automatically at checkout. */
export type AgreementKind = "nda" | "authorization" | "terms";
export const SIGNABLE_KINDS = ["nda", "authorization"] as const;
export type SignableKind = (typeof SIGNABLE_KINDS)[number];
export const AGREEMENT_KINDS: readonly AgreementKind[] = ["nda", "authorization", "terms"];

export const TEST_TECHNIQUES = [
  { id: "external", label: "External network and services" },
  { id: "web", label: "Web applications and APIs" },
  { id: "mobile", label: "Mobile apps" },
  { id: "internal", label: "Internal network (on-site or VPN)" },
  { id: "cloud", label: "Cloud configuration review" },
  { id: "wireless", label: "Wireless networks" },
  { id: "phishing", label: "Phishing and social engineering" },
  { id: "physical", label: "Physical access" },
] as const;
export type TechniqueId = (typeof TEST_TECHNIQUES)[number]["id"];
export const TECHNIQUE_IDS = TEST_TECHNIQUES.map((t) => t.id) as readonly TechniqueId[];

export interface Signer {
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly role: string;
}

export interface NdaFields { readonly purpose: string }
export interface AuthorizationFields {
  readonly inScope: string;
  readonly outOfScope: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly techniques: readonly TechniqueId[];
  readonly emergencyName: string;
  readonly emergencyPhone: string;
}
export type AgreementFields = NdaFields | AuthorizationFields | Record<string, never>;

/** What the browser sends to sign. */
export interface SignRequest {
  readonly kind: SignableKind;
  readonly signer: Signer;
  readonly fields: AgreementFields;
  /** Typed full name: the signature. Must match the signer's name. */
  readonly signature: string;
  readonly consent: boolean;
  /** Optional link to an order (R1V-) this agreement belongs to. */
  readonly refCode: string | null;
}

export interface Agreement {
  readonly id: string;
  readonly code: string;
  readonly kind: AgreementKind;
  readonly version: string;
  readonly docHash: string;
  readonly signedAt: string;
  readonly signer: Signer;
  readonly signature: string;
  readonly fields: AgreementFields;
  readonly refCode: string | null;
  readonly country: string | null;
  /** The exact wording signed, so later edits to the site never change a signed copy. */
  readonly document: LegalDoc;
  /** Evidence of signing; shown to the operator only. */
  readonly ip?: string;
  readonly userAgent?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AGREEMENT_CODE = /^R1A-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_WINDOW_DAYS = 366;

const squash = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** 12 random characters (~60 bits): a signed copy is reachable only by whoever holds the code. */
export function generateAgreementCode(randomInt: (max: number) => number): string {
  const block = () => Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
  return `R1A-${block()}-${block()}-${block()}`;
}
export const isValidAgreementCode = (code: string): boolean => AGREEMENT_CODE.test(normalizeTrackingCode(code));

export const documentFor = (kind: AgreementKind): LegalDoc => LEGAL_DOCS[kind];

/** SHA-256 of the document wording, shown on the signed copy so any change is detectable. */
export async function hashDocument(doc: LegalDoc): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function validateSigner(s: Signer, companyRequired: boolean): string[] {
  const errors: string[] = [];
  if (s.name.trim().length < 2) errors.push("Enter your full name.");
  if (!EMAIL.test(s.email.trim())) errors.push("Enter a valid email address.");
  if (companyRequired && s.company.trim().length < 2) errors.push("Enter the company that owns the systems.");
  if (s.role.trim().length < 2) errors.push("Enter your role or title.");
  return errors;
}

function validateAuthorization(f: AuthorizationFields): string[] {
  const errors: string[] = [];
  if (f.inScope.trim().length < 3) errors.push("List the systems in scope (domains, IP ranges, apps).");
  if (!DATE.test(f.windowStart) || !DATE.test(f.windowEnd)) errors.push("Choose the testing window start and end dates.");
  else {
    const days = (Date.parse(f.windowEnd) - Date.parse(f.windowStart)) / 86_400_000;
    if (!(days >= 0)) errors.push("The testing window must end on or after it starts.");
    else if (days > MAX_WINDOW_DAYS) errors.push("Keep the testing window to a year or less.");
  }
  if (f.techniques.length === 0) errors.push("Tick at least one testing technique.");
  if (f.techniques.some((t) => !TECHNIQUE_IDS.includes(t))) errors.push("Unknown testing technique.");
  if (f.emergencyName.trim().length < 2) errors.push("Name an emergency contact.");
  if (f.emergencyPhone.replace(/\D/g, "").length < 9) errors.push("Give the emergency contact's phone number with country code.");
  return errors;
}

/** Shared by the form and the API. Returns human-readable problems (empty = OK). */
export function validateSignRequest(r: SignRequest): string[] {
  const errors = validateSigner(r.signer, r.kind === "authorization");
  if (r.kind === "authorization") errors.push(...validateAuthorization(r.fields as AuthorizationFields));
  if (r.signature.trim() === "" || squash(r.signature) !== squash(r.signer.name)) errors.push("Type your full name exactly as above to sign.");
  if (!r.consent) errors.push("Confirm that typing your name is your signature.");
  if (r.refCode && !isValidTrackingCode(r.refCode)) errors.push("The order code should look like R1V-XXXX-XXXX.");
  return errors;
}

/** Plain-language lines for the signed copy's detail block. */
export function describeFields(kind: AgreementKind, fields: AgreementFields): { label: string; value: string }[] {
  if (kind === "nda") {
    const f = fields as NdaFields;
    return [{ label: "Purpose", value: f.purpose?.trim() || "Any possible or actual project between the Parties" }];
  }
  if (kind === "authorization") {
    const f = fields as AuthorizationFields;
    return [
      { label: "In scope", value: f.inScope },
      { label: "Out of scope", value: f.outOfScope.trim() || "Everything not listed as in scope" },
      { label: "Testing window", value: `${f.windowStart} to ${f.windowEnd}` },
      { label: "Techniques allowed", value: f.techniques.map((t) => TEST_TECHNIQUES.find((x) => x.id === t)?.label ?? t).join(", ") },
      { label: "Emergency contact", value: `${f.emergencyName} · ${f.emergencyPhone}` },
    ];
  }
  return [];
}

export const KIND_LABEL: Record<AgreementKind, string> = { nda: "NDA", authorization: "Authorization to Test", terms: "Terms accepted" };
