import { describe, expect, test } from "vitest";
import { describeFields, type AuthorizationFields, generateAgreementCode, hashDocument, isValidAgreementCode, validateSignRequest, type SignRequest } from "@/lib/agreements";
import { LEGAL_DOCS, LEGAL_DOC_IDS, NDA } from "@/lib/legal";

const signer = { name: "Tari Moyo", email: "tari@example.com", company: "Moyo Pay", role: "CTO" };
const nda: SignRequest = { kind: "nda", signer, fields: { purpose: "Wallet app" }, signature: "tari  moyo", consent: true, refCode: null };
const auth: SignRequest = {
  kind: "authorization", signer, signature: "Tari Moyo", consent: true, refCode: "r1v-abcd-efgh",
  fields: { inScope: "app.moyopay.co.zw", outOfScope: "", windowStart: "2026-12-01", windowEnd: "2026-12-14", techniques: ["web", "external"], emergencyName: "Rudo", emergencyPhone: "+263 77 123 4567" },
};

describe("signing rules", () => {
  test("accepts a complete NDA; the typed signature may differ in case and spacing", () => {
    expect(validateSignRequest(nda)).toEqual([]);
  });

  test("rejects a signature that doesn't match the signer's name, and missing consent", () => {
    const errors = validateSignRequest({ ...nda, signature: "Someone Else", consent: false });
    expect(errors).toContain("Type your full name exactly as above to sign.");
    expect(errors).toContain("Confirm that typing your name is your signature.");
  });

  test("authorization needs a company, scope, a valid window, techniques and an emergency contact", () => {
    expect(validateSignRequest(auth)).toEqual([]);
    const bad: SignRequest = { ...auth, signer: { ...signer, company: "" }, fields: { ...(auth.fields as AuthorizationFields), inScope: "", windowStart: "2026-12-14", windowEnd: "2026-12-01", techniques: [], emergencyPhone: "12" } };
    const errors = validateSignRequest(bad);
    expect(errors).toEqual(expect.arrayContaining([
      "Enter the company that owns the systems.",
      "List the systems in scope (domains, IP ranges, apps).",
      "The testing window must end on or after it starts.",
      "Tick at least one testing technique.",
      "Give the emergency contact's phone number with country code.",
    ]));
  });

  test("rejects a testing window longer than a year and a malformed order code", () => {
    const errors = validateSignRequest({ ...auth, refCode: "nope", fields: { ...(auth.fields as AuthorizationFields), windowEnd: "2028-01-01" } });
    expect(errors).toContain("Keep the testing window to a year or less.");
    expect(errors).toContain("The order code should look like R1V-XXXX-XXXX.");
  });

  test("describes authorization details in plain words for the certificate", () => {
    const lines = describeFields("authorization", auth.fields);
    expect(lines.find((l) => l.label === "Techniques allowed")?.value).toBe("Web applications and APIs, External network and services");
    expect(lines.find((l) => l.label === "Out of scope")?.value).toMatch(/not listed/);
  });
});

describe("codes and fingerprints", () => {
  test("agreement codes have 12 random characters and validate case-insensitively", () => {
    let i = 0;
    const code = generateAgreementCode((max) => (i++ * 7) % max);
    expect(code).toMatch(/^R1A-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(isValidAgreementCode(code.toLowerCase())).toBe(true);
    expect(isValidAgreementCode("R1V-ABCD-EFGH")).toBe(false);
  });

  test("the document hash is stable and changes when the wording changes", async () => {
    const h = await hashDocument(NDA);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashDocument(NDA)).toBe(h);
    expect(await hashDocument({ ...NDA, intro: ["changed"] })).not.toBe(h);
  });

  test("every legal document has a version, sections and no empty paragraphs", () => {
    for (const id of LEGAL_DOC_IDS) {
      const doc = LEGAL_DOCS[id];
      expect(doc.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.sections.length).toBeGreaterThan(3);
      for (const s of doc.sections) for (const b of s.body) expect((typeof b === "string" ? b : b.join("")).trim().length).toBeGreaterThan(0);
    }
  });
});
