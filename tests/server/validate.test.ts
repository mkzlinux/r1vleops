import { describe, expect, test } from "vitest";
import { parseAdvance, parseFileMetas, parseNewOrder, parseNewWorker } from "@/server/validate";

const good = { client: { name: "Rudo", company: "", email: "r@x.co", whatsapp: "+263771234567" }, brief: "hi", items: [{ serviceId: "cre-flyer", qty: 2 }], region: "zw" };

describe("request validation", () => {
  test("accepts a well-formed order and drops unknown fields", () => {
    const parsed = parseNewOrder({ ...good, client: { ...good.client, isAdmin: true }, total: 1 });
    expect(parsed).toEqual(good);
  });

  test("rejects wrong shapes instead of crashing", () => {
    expect(() => parseNewOrder(null)).toThrow();
    expect(() => parseNewOrder({ ...good, client: "x" })).toThrow();
    expect(() => parseNewOrder({ ...good, items: "cre-flyer" })).toThrow();
    expect(() => parseNewOrder({ ...good, items: [{ serviceId: 5, qty: 1 }] })).toThrow();
    expect(() => parseNewOrder({ ...good, region: "mars" })).toThrow();
  });

  test("validates advance, worker and file payloads", () => {
    expect(parseAdvance({ stage: "in_progress", progress: 40, note: "ok" })).toEqual({ stage: "in_progress", progress: 40, note: "ok" });
    expect(() => parseAdvance({ stage: "hacked", progress: 1, note: "" })).toThrow();
    expect(parseNewWorker({ name: "Tari", role: "Designer", departmentId: "creative", email: "" }).departmentId).toBe("creative");
    expect(() => parseNewWorker({ name: "Tari", role: "x", departmentId: "hr", email: "" })).toThrow();
    expect(parseFileMetas({ files: [{ name: "a.png", type: "image/png", size: 10 }] })).toHaveLength(1);
    expect(() => parseFileMetas({ files: [{ name: "a.png", type: "image/png", size: -1 }] })).toThrow();
  });
});
