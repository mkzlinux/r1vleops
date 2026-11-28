import { describe, expect, test } from "vitest";
import { hashDocument } from "@/lib/agreements";
import { NDA } from "@/lib/legal";
import { createAgreementStore, toPublicAgreement } from "@/server/agreementStore";
import { parseSignRequest, requireTermsAccepted } from "@/server/validate";
import { sqliteClient } from "./helpers";

const now = () => new Date("2026-11-28T09:00:00Z");
const ctx = { ip: "196.4.80.1", userAgent: "Vitest", country: "ZW" };
const body = { kind: "nda", signer: { name: "Tari Moyo", email: "Tari@Example.com", company: "Moyo Pay", role: "CTO" }, fields: { purpose: "Wallet app" }, signature: "Tari Moyo", consent: true, refCode: "" };

describe("agreements (D1)", () => {
  test("signs an NDA, keeps the exact wording and evidence, and finds it by code", async () => {
    const store = createAgreementStore(sqliteClient(), now);
    const a = await store.sign(parseSignRequest(body), ctx);
    expect(a.code).toMatch(/^R1A-/);
    expect(a.signedAt).toBe("2026-11-28T09:00:00.000Z");
    expect(a.docHash).toBe(await hashDocument(NDA));

    const found = await store.findByCode(a.code.toLowerCase());
    expect(found?.document.title).toBe("Mutual Non-Disclosure Agreement");
    expect(found?.ip).toBe("196.4.80.1");
    expect(found?.fields).toEqual({ purpose: "Wallet app" });

    const pub = toPublicAgreement(found!);
    expect(pub.ip).toBeUndefined();
    expect(pub.userAgent).toBeUndefined();
  });

  test("refuses a signature that doesn't match, and unknown codes find nothing", async () => {
    const store = createAgreementStore(sqliteClient(), now);
    await expect(store.sign(parseSignRequest({ ...body, signature: "Someone" }), ctx)).rejects.toThrow(/Type your full name/);
    expect(await store.findByCode("R1A-AAAA-BBBB-CCCC")).toBeNull();
    expect(await store.findByCode("'; DROP TABLE agreements; --")).toBeNull();
  });

  test("records Terms acceptance linked to an order, and lists everything for the operator", async () => {
    const store = createAgreementStore(sqliteClient(), now);
    await store.acceptTerms({ name: "Tari Moyo", email: "tari@example.com", company: "" }, "R1V-ABCD-EFGH", ctx);
    await store.sign(parseSignRequest(body), ctx);
    const list = await store.list();
    expect(list.map((r) => r.kind).sort()).toEqual(["nda", "terms"]);
    expect(list.find((r) => r.kind === "terms")?.refCode).toBe("R1V-ABCD-EFGH");
    expect(list[0]).not.toHaveProperty("document");
  });
});

describe("parsing untrusted signing input", () => {
  test("rejects unknown agreement types and techniques", () => {
    expect(() => parseSignRequest({ ...body, kind: "terms" })).toThrow(/agreement type/);
    expect(() => parseSignRequest({ ...body, kind: "authorization", fields: { inScope: "x", windowStart: "2026-12-01", windowEnd: "2026-12-02", techniques: ["ddos"], emergencyName: "R", emergencyPhone: "1" } })).toThrow(/technique/);
  });

  test("consent must be literally true", () => {
    expect(parseSignRequest({ ...body, consent: "yes" }).consent).toBe(false);
  });

  test("public forms must send acceptTerms: true", () => {
    expect(() => requireTermsAccepted({})).toThrow(/accept the Terms/);
    expect(() => requireTermsAccepted({ acceptTerms: "true" })).toThrow();
    expect(() => requireTermsAccepted({ acceptTerms: true })).not.toThrow();
  });
});
