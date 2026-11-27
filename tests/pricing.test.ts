import { describe, expect, test } from "vitest";
import { priceNote, regionFromCountry, unitPrice } from "@/lib/pricing";
import { SERVICES, serviceById } from "@/lib/catalog";

const flyer = serviceById("cre-flyer")!;
const logo = serviceById("cre-logo")!;
const app = serviceById("int-app")!;

describe("regional pricing", () => {
  test("Zimbabwe flyers: $20 for one, $17 each for 2+", () => {
    expect(unitPrice(flyer, "zw", 1)).toBe(20);
    expect(unitPrice(flyer, "zw", 2)).toBe(17);
    expect(unitPrice(flyer, "zw", 10)).toBe(17);
  });

  test("international keeps the list price", () => {
    expect(unitPrice(flyer, "intl", 1)).toBe(58);
    expect(unitPrice(flyer, "intl", 5)).toBe(58);
    expect(unitPrice(logo, "intl", 1)).toBe(243);
  });

  test("Zimbabwe keeps its local list; international uses market rates", () => {
    expect(unitPrice(logo, "zw", 1)).toBe(20);
    expect(unitPrice(app, "zw", 1)).toBe(1486);
    expect(unitPrice(app, "intl", 1)).toBe(7436);
  });

  test("every service has a Zimbabwe price at or below the international one", () => {
    for (const s of SERVICES) {
      expect(s.regional?.zw?.length, s.id).toBeGreaterThan(0);
      expect(unitPrice(s, "zw", 1), s.id).toBeLessThanOrEqual(s.priceUsd);
    }
  });

  test("describes volume discounts", () => {
    expect(priceNote(flyer, "zw")).toBe("$17 each for 2+");
    expect(priceNote(flyer, "intl")).toBeNull();
  });

  test("maps countries to regions", () => {
    expect(regionFromCountry("ZW")).toBe("zw");
    expect(regionFromCountry("zw")).toBe("zw");
    expect(regionFromCountry("ZA")).toBe("intl");
    expect(regionFromCountry(null)).toBe("intl");
  });

});

describe("motion graphics per 30 seconds", () => {
  test("a 90-second video is three 30s blocks", async () => {
    const { priceBucket } = await import("@/lib/bucket");
    const { maxQtyFor } = await import("@/lib/catalog");
    const motion = serviceById("cre-motion")!;
    expect(motion).toMatchObject({ unit: "each", per: "30s" });
    expect(priceBucket([{ serviceId: "cre-motion", qty: 1 }], SERVICES).total).toBe(584);
    expect(priceBucket([{ serviceId: "cre-motion", qty: 3 }], SERVICES).total).toBe(3 * 432);
    expect(priceBucket([{ serviceId: "cre-motion", qty: 1 }], SERVICES, "zw").total).toBe(248);
    expect(priceBucket([{ serviceId: "cre-motion", qty: 3 }], SERVICES, "zw").total).toBe(3 * 196);
    expect(priceNote(motion, "intl")).toBe("$432 per 30s from 2 blocks");
    expect(maxQtyFor(motion)).toBe(20);
  });
});
