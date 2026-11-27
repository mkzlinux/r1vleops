import { describe, expect, test } from "vitest";
import { SERVICES } from "@/lib/catalog";
import { buildQuote, canCheckoutQuote, discountLine, isValidQuoteCode, respondToQuote, validateQuoteRequest } from "@/lib/quotes";

const client = { name: "Tari Moyo", company: "", email: "tari@example.com", whatsapp: "+263771234567" };
const request = { client, items: [{ serviceId: "cre-logo", qty: 1 }, { serviceId: "cre-flyer", qty: 4 }], region: "intl" as const, proposedTotal: 300, note: "Startup budget" };
const T0 = new Date("2026-11-28T09:00:00Z");
let seq = 0;
const random = () => ((seq = (seq * 9301 + 49297) % 233280) / 233280);

describe("negotiation tickets", () => {
  test("validates the request: details, items and a sensible budget", () => {
    expect(validateQuoteRequest(request, 490)).toEqual([]);
    expect(validateQuoteRequest({ ...request, proposedTotal: 0 }, 490).join()).toMatch(/budget/i);
    expect(validateQuoteRequest({ ...request, proposedTotal: 600 }, 490).join()).toMatch(/less than/i);
    expect(validateQuoteRequest({ ...request, items: [] }, 0).join()).toMatch(/at least one/i);
    expect(validateQuoteRequest({ ...request, client: { ...client, email: "x" } }, 490).join()).toMatch(/email/i);
  });

  test("prices the bucket server-side and opens with a ticket code", () => {
    const q = buildQuote(request, { services: SERVICES, now: T0, random });
    expect(q.listTotal).toBe(243 + 4 * 58);
    expect(q.proposedTotal).toBe(300);
    expect(q.status).toBe("open");
    expect(isValidQuoteCode(q.code)).toBe(true);
    expect(canCheckoutQuote(q, T0)).toBe(false);
  });

  test("operator can accept, counter or decline; an offer is valid for 14 days", () => {
    const q = buildQuote(request, { services: SERVICES, now: T0, random });
    const accepted = respondToQuote(q, { action: "accept", message: "Deal" }, T0);
    expect(accepted).toMatchObject({ status: "accepted", offerTotal: 300, reply: "Deal" });
    const countered = respondToQuote(q, { action: "counter", amount: 400, message: "Meet halfway?" }, T0);
    expect(countered).toMatchObject({ status: "countered", offerTotal: 400 });
    expect(canCheckoutQuote(countered, new Date("2026-12-10T00:00:00Z"))).toBe(true);
    expect(canCheckoutQuote(countered, new Date("2026-12-13T00:00:00Z"))).toBe(false);
    const declined = respondToQuote(q, { action: "decline", message: "Can't go that low" }, T0);
    expect(declined.status).toBe("declined");
    expect(canCheckoutQuote(declined, T0)).toBe(false);
  });

  test("counter must sit between the client's budget and the list price", () => {
    const q = buildQuote(request, { services: SERVICES, now: T0, random });
    expect(() => respondToQuote(q, { action: "counter", amount: 1000, message: "" }, T0)).toThrow(/list price/i);
    expect(() => respondToQuote(q, { action: "counter", amount: 0, message: "" }, T0)).toThrow();
  });

  test("the agreed price becomes a discount line against current prices", () => {
    const q = respondToQuote(buildQuote(request, { services: SERVICES, now: T0, random }), { action: "counter", amount: 400, message: "" }, T0);
    expect(discountLine(q, 490)).toEqual({ serviceId: "negotiated-discount", name: `Negotiated price (${q.code})`, qty: 1, rateUsd: -90 });
    expect(discountLine(q, 380)).toBeNull();
  });
});
