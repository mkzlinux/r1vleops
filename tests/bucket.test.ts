import { describe, expect, test } from "vitest";
import { addToBucket, bucketCount, bucketWhatsappMessage, parseBucket, priceBucket, removeFromBucket, setBucketQty } from "@/lib/bucket";
import { SERVICES } from "@/lib/catalog";

describe("bucket", () => {
  test("adds items and increases quantity for per-piece items", () => {
    const b = addToBucket(addToBucket([], "cre-flyer", SERVICES), "cre-flyer", SERVICES);
    expect(b).toEqual([{ serviceId: "cre-flyer", qty: 2 }]);
  });

  test("one-off packs never exceed quantity 1", () => {
    const b = addToBucket(addToBucket([], "int-site", SERVICES), "int-site", SERVICES);
    expect(b).toEqual([{ serviceId: "int-site", qty: 1 }]);
  });

  test("does not mutate the original bucket", () => {
    const original = [{ serviceId: "cre-poster", qty: 1 }] as const;
    const next = setBucketQty(original, "cre-poster", 4, SERVICES);
    expect(original[0].qty).toBe(1);
    expect(next[0].qty).toBe(4);
  });

  test("setting quantity to 0 removes the line; quantities are clamped", () => {
    expect(setBucketQty([{ serviceId: "cre-social", qty: 3 }], "cre-social", 0, SERVICES)).toEqual([]);
    expect(setBucketQty([{ serviceId: "cre-social", qty: 3 }], "cre-social", 999, SERVICES)[0].qty).toBe(50);
    expect(setBucketQty([{ serviceId: "sec-monitor", qty: 1 }], "sec-monitor", 40, SERVICES)[0].qty).toBe(12);
  });

  test("ignores unknown services", () => {
    expect(addToBucket([], "nope", SERVICES)).toEqual([]);
  });

  test("removes lines and counts pieces", () => {
    const b = [{ serviceId: "cre-flyer", qty: 3 }, { serviceId: "int-site", qty: 1 }];
    expect(bucketCount(b)).toBe(4);
    expect(removeFromBucket(b, "cre-flyer")).toEqual([{ serviceId: "int-site", qty: 1 }]);
  });

  test("prices the bucket with a 50% deposit", () => {
    const priced = priceBucket([{ serviceId: "cre-flyer", qty: 3 }, { serviceId: "int-site", qty: 1 }], SERVICES);
    expect(priced.total).toBe(3 * 57 + 1473);
    expect(priced.deposit).toBe(priced.total / 2);
    expect(priced.lines).toHaveLength(2);
  });

  test("prices with Zimbabwe tiers when region is zw", () => {
    const priced = priceBucket([{ serviceId: "cre-flyer", qty: 2 }, { serviceId: "cre-logo", qty: 1 }], SERVICES, "zw");
    expect(priced.total).toBe(2 * 17 + 20);
    expect(bucketWhatsappMessage([{ serviceId: "cre-flyer", qty: 1 }], SERVICES, "zw")).toMatch(/Zimbabwe pricing/);
  });

  test("parses stored data defensively", () => {
    expect(parseBucket('[{"serviceId":"cre-flyer","qty":2},{"serviceId":5},{"serviceId":"x","qty":-1}]')).toEqual([{ serviceId: "cre-flyer", qty: 2 }]);
    expect(parseBucket("not json")).toEqual([]);
    expect(parseBucket(null)).toEqual([]);
  });

  test("builds a WhatsApp negotiation message listing items and total", () => {
    const msg = bucketWhatsappMessage([{ serviceId: "cre-poster", qty: 2 }], SERVICES);
    expect(msg).toMatch(/2 × Poster Design/);
    expect(msg).toMatch(/\$156/);
  });
});
