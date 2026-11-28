import { randomInt, randomUUID } from "node:crypto";
import { clientKey } from "@/lib/opsStats";
import { normalizeTrackingCode } from "@/lib/orders";
import {
  documentFor, generateAgreementCode, hashDocument, isValidAgreementCode, validateSignRequest,
  type Agreement, type AgreementKind, type SignRequest, type Signer,
} from "@/lib/agreements";
import type { SqlClient } from "./sql";
import { StoreError } from "./sqlStore";

/** Where and how a signature was made; kept as evidence, shown to the operator only. */
export interface SigningContext { readonly ip: string; readonly userAgent: string; readonly country: string | null }

interface AgreementRow {
  id: string; code: string; kind: AgreementKind; version: string; doc_hash: string; signed_at: string; signer: string;
  signature: string; fields: string; ref_code: string | null; country: string | null; ip: string; user_agent: string; document: string;
}

const toAgreement = (r: AgreementRow): Agreement => ({
  id: r.id, code: r.code, kind: r.kind, version: r.version, docHash: r.doc_hash, signedAt: r.signed_at,
  signer: JSON.parse(r.signer), signature: r.signature, fields: JSON.parse(r.fields), refCode: r.ref_code,
  country: r.country, document: JSON.parse(r.document), ip: r.ip, userAgent: r.user_agent,
});

/** What the public signed-copy page may show: no IP or browser details. */
export const toPublicAgreement = (a: Agreement): Agreement => {
  const { ip: _ip, userAgent: _ua, ...rest } = a;
  return rest;
};

const clean = (s: Signer): Signer => ({ name: s.name.trim(), email: s.email.trim(), company: s.company.trim(), role: s.role.trim() });

export function createAgreementStore(sql: SqlClient, now: () => Date = () => new Date()) {
  const insert = async (kind: AgreementKind, signer: Signer, signature: string, fields: object, refCode: string | null, ctx: SigningContext): Promise<Agreement> => {
    const document = documentFor(kind);
    const a: Agreement = {
      id: randomUUID(), code: generateAgreementCode(randomInt), kind, version: document.version, docHash: await hashDocument(document),
      signedAt: now().toISOString(), signer: clean(signer), signature: signature.trim(), fields: fields as Agreement["fields"],
      refCode: refCode ? normalizeTrackingCode(refCode) : null, country: ctx.country, document,
      ip: ctx.ip.slice(0, 64), userAgent: ctx.userAgent.slice(0, 300),
    };
    await sql.query(
      "INSERT INTO agreements (id, code, kind, version, doc_hash, signed_at, signer, signer_email, signature, fields, ref_code, country, ip, user_agent, document) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [a.id, a.code, a.kind, a.version, a.docHash, a.signedAt, JSON.stringify(a.signer), clientKey(a.signer.email), a.signature, JSON.stringify(a.fields), a.refCode, a.country, a.ip ?? "", a.userAgent ?? "", JSON.stringify(document)],
    );
    return a;
  };

  return {
    /** A client signs an NDA or Authorization to Test. */
    async sign(request: SignRequest, ctx: SigningContext): Promise<Agreement> {
      const problems = validateSignRequest(request);
      if (problems.length > 0) throw new StoreError(problems[0]);
      return insert(request.kind, request.signer, request.signature, request.fields, request.refCode, ctx);
    },

    /** Records that a client ticked "I agree to the Terms" when ordering or opening a ticket. */
    async acceptTerms(client: { name: string; email: string; company: string }, refCode: string, ctx: SigningContext): Promise<Agreement> {
      return insert("terms", { name: client.name, email: client.email, company: client.company, role: "" }, client.name, {}, refCode, ctx);
    },

    async findByCode(code: string): Promise<Agreement | null> {
      if (!isValidAgreementCode(code)) return null;
      const [row] = await sql.query<AgreementRow>("SELECT * FROM agreements WHERE code = ?", [normalizeTrackingCode(code)]);
      return row ? toAgreement(row) : null;
    },

    /** Operator list, newest first (without document snapshots, which can be large). */
    async list(): Promise<Omit<Agreement, "document">[]> {
      const rows = await sql.query<Omit<AgreementRow, "document">>(
        "SELECT id, code, kind, version, doc_hash, signed_at, signer, signature, fields, ref_code, country, ip, user_agent FROM agreements ORDER BY signed_at DESC LIMIT 300");
      return rows.map((r) => { const { document: _d, ...rest } = toAgreement({ ...r, document: "null" }); return rest; });
    },
  };
}

export type AgreementStore = ReturnType<typeof createAgreementStore>;
