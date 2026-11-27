import { describe, expect, test } from "vitest";
import {
  buildOrder,
  generateTrackingCode,
  isValidTrackingCode,
  normalizeTrackingCode,
  nextInvoiceNo,
  orderTotals,
  advanceOrder,
  stageLabel,
  validateNewOrder,
} from "@/lib/orders";
import { SERVICES } from "@/lib/catalog";
import type { NewOrderInput } from "@/lib/types";

const client = { name: "Tendai M", company: "Acme", email: "t@acme.co", whatsapp: "+263771234567" };
const input: NewOrderInput = { client, brief: "Need a site", items: [{ serviceId: "int-site", qty: 1 }, { serviceId: "cre-brand", qty: 1 }], region: "intl" as const };
const fixedRandom = () => 0.5;

describe("tracking codes", () => {
  test("generates codes in R1V-XXXX-XXXX format without ambiguous characters", () => {
    const code = generateTrackingCode(Math.random);
    expect(code).toMatch(/^R1V-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  test("normalizes lowercase and stray spaces", () => {
    expect(normalizeTrackingCode("  r1v-abcd-ef23 ")).toBe("R1V-ABCD-EF23");
  });

  test("rejects malformed codes", () => {
    expect(isValidTrackingCode("R1V-ABCD")).toBe(false);
    expect(isValidTrackingCode("R1V-ABCD-EF2O")).toBe(false);
    expect(isValidTrackingCode("R1V-ABCD-EF23")).toBe(true);
  });
});

describe("invoice numbers", () => {
  test("increments the highest existing number for the year", () => {
    expect(nextInvoiceNo(["R1VLE-INV-2026-001", "R1VLE-INV-2026-004"], 2026)).toBe("R1VLE-INV-2026-005");
  });

  test("starts at 001 in a new year", () => {
    expect(nextInvoiceNo(["R1VLE-INV-2025-010"], 2026)).toBe("R1VLE-INV-2026-001");
  });
});

describe("totals", () => {
  test("splits total into 50% deposit and balance", () => {
    const order = buildOrder(input, { services: SERVICES, existingInvoiceNos: [], now: new Date("2026-11-25"), random: fixedRandom });
    const t = orderTotals(order);
    expect(t.total).toBe(1473 + 1463);
    expect(t.deposit).toBe(1468);
    expect(t.balance).toBe(1468);
  });
});

describe("buildOrder", () => {
  test("creates an order awaiting deposit in the first service's department", () => {
    const order = buildOrder(input, { services: SERVICES, existingInvoiceNos: [], now: new Date("2026-11-25"), random: fixedRandom });
    expect(order.stage).toBe("awaiting_deposit");
    expect(order.departmentId).toBe("intelligence");
    expect(order.invoiceNo).toBe("R1VLE-INV-2026-001");
    expect(order.lines).toHaveLength(2);
    expect(order.updates[0].note).toMatch(/invoice/i);
  });

  test("keeps quantities for per-piece items and clamps one-off packs to 1", () => {
    const order = buildOrder(
      { client, brief: "", items: [{ serviceId: "cre-flyer", qty: 4 }, { serviceId: "int-site", qty: 3 }], region: "intl" as const },
      { services: SERVICES, existingInvoiceNos: [], now: new Date("2026-11-25"), random: fixedRandom },
    );
    expect(order.lines.map((l) => l.qty)).toEqual([4, 1]);
    expect(orderTotals(order).total).toBe(4 * 57 + 1473);
    expect(order.departmentId).toBe("creative");
  });

  test("rejects zero or fractional quantities", () => {
    expect(validateNewOrder({ ...input, items: [{ serviceId: "cre-flyer", qty: 0 }], region: "intl" as const })).toEqual(expect.arrayContaining([expect.stringMatching(/quantity/i)]));
  });

  test("Zimbabwe orders use local tiers; the phone number doesn't decide the price list", () => {
    const zw = { client, brief: "", items: [{ serviceId: "cre-flyer", qty: 3 }], region: "zw" as const };
    const order = buildOrder(zw, { services: SERVICES, existingInvoiceNos: [], now: new Date("2026-11-25"), random: fixedRandom });
    expect(order.lines[0].rateUsd).toBe(17);
    expect(order.region).toBe("zw");
    expect(validateNewOrder(zw)).toEqual([]);
    expect(validateNewOrder({ ...zw, client: { ...client, whatsapp: "+27 82 123 4567" } })).toEqual([]);
    expect(buildOrder({ ...zw, country: "ZW" }, { services: SERVICES, existingInvoiceNos: [], now: new Date("2026-11-25"), random: fixedRandom }).country).toBe("ZW");
  });

  test("throws for unknown services", () => {
    expect(() =>
      buildOrder({ ...input, items: [{ serviceId: "nope", qty: 1 }], region: "intl" as const }, { services: SERVICES, existingInvoiceNos: [], now: new Date(), random: fixedRandom }),
    ).toThrow(/unknown service/i);
  });
});

describe("validateNewOrder", () => {
  test("returns errors for missing contact details and no services", () => {
    const errors = validateNewOrder({ client: { name: "", company: "", email: "bad", whatsapp: "" }, brief: "", items: [], region: "intl" as const });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/name/i),
      expect.stringMatching(/email/i),
      expect.stringMatching(/whatsapp/i),
      expect.stringMatching(/service/i),
    ]));
  });

  test("accepts a complete order", () => {
    expect(validateNewOrder(input)).toEqual([]);
  });
});

describe("advanceOrder", () => {
  const base = buildOrder(input, { services: SERVICES, existingInvoiceNos: [], now: new Date("2026-11-25"), random: fixedRandom });

  test("returns a new order with the update appended and does not mutate the original", () => {
    const next = advanceOrder(base, { stage: "deposit_confirmed", progress: 5, note: "Deposit received" }, new Date("2026-11-26"));
    expect(next.stage).toBe("deposit_confirmed");
    expect(next.updates).toHaveLength(2);
    expect(base.updates).toHaveLength(1);
    expect(base.stage).toBe("awaiting_deposit");
  });

  test("clamps progress between 0 and 100", () => {
    expect(advanceOrder(base, { stage: "in_progress", progress: 140, note: "" }, new Date()).progress).toBe(100);
    expect(advanceOrder(base, { stage: "in_progress", progress: -5, note: "" }, new Date()).progress).toBe(0);
  });

  test("delivered forces progress to 100", () => {
    expect(advanceOrder(base, { stage: "delivered", progress: 80, note: "" }, new Date()).progress).toBe(100);
  });
});

test("stageLabel is human readable", () => {
  expect(stageLabel("awaiting_deposit")).toBe("Awaiting 50% deposit");
});
