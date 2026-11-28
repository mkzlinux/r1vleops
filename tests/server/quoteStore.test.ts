import { describe, expect, test } from "vitest";
import { memoryBlobStore } from "@/lib/data/localRepository";
import { orderTotals } from "@/lib/orders";
import { createQuoteStore } from "@/server/quoteStore";
import { createSqlStore } from "@/server/sqlStore";
import { sqliteClient } from "./helpers";

const client = { name: "Tari Moyo", company: "", email: "tari@example.com", whatsapp: "+263771234567" };
const now = () => new Date("2026-11-28T09:00:00Z");

function setup() {
  const sql = sqliteClient();
  const orders = createSqlStore(sql, { now, blobs: memoryBlobStore() });
  return { orders, quotes: createQuoteStore(sql, orders, now) };
}

describe("negotiation tickets (D1)", () => {
  test("open → counter → client checks out at the agreed price, once", async () => {
    const { orders, quotes } = setup();
    const q = await quotes.create({ client, items: [{ serviceId: "cre-logo", qty: 1 }, { serviceId: "cre-flyer", qty: 4 }], region: "intl", proposedTotal: 300, note: "Startup" });
    expect(q.listTotal).toBe(475);
    await expect(quotes.checkout(q.code)).rejects.toThrow(/haven't replied/);

    await quotes.respond(q.id, { action: "counter", amount: 400, message: "Meet halfway" });
    const order = await quotes.checkout(q.code);
    expect(orderTotals(order).total).toBe(400);
    expect(order.lines.at(-1)).toMatchObject({ serviceId: "negotiated-discount", rateUsd: -75 });
    expect(orderTotals(order).deposit).toBe(200);

    const again = await quotes.checkout(q.code);
    expect(again.trackingCode).toBe(order.trackingCode);
    expect((await quotes.findByCode(q.code))?.status).toBe("converted");
    expect(await orders.listOrders()).toHaveLength(1);
  });

  test("declined tickets cannot check out and bad requests are rejected", async () => {
    const { quotes } = setup();
    const q = await quotes.create({ client, items: [{ serviceId: "cre-logo", qty: 1 }], region: "intl", proposedTotal: 100, note: "" });
    await quotes.respond(q.id, { action: "decline", message: "Sorry" });
    await expect(quotes.checkout(q.code)).rejects.toThrow(/no longer available/);
    await expect(quotes.create({ client, items: [{ serviceId: "cre-logo", qty: 1 }], region: "intl", proposedTotal: 999, note: "" })).rejects.toThrow(/less than/);
  });
});

describe("operator dashboard drafts", () => {
  test("invoice with an agreed total and an offer the client can accept", async () => {
    const { orders, quotes } = setup();
    const order = await orders.createOrderAsOperator({ client, brief: "Walk-in", items: [{ serviceId: "cre-flyer", qty: 4 }], region: "zw" }, 60);
    expect(orderTotals(order).total).toBe(60);
    expect(order.lines.at(-1)).toMatchObject({ serviceId: "price-adjustment", rateUsd: -8 });
    await expect(orders.createOrderAsOperator({ client, brief: "", items: [{ serviceId: "cre-logo", qty: 1 }], region: "zw" }, 999)).rejects.toThrow(/above/);

    const offer = await quotes.createOffer({ client, items: [{ serviceId: "cre-logo", qty: 1 }], region: "intl", note: "" }, { offerTotal: 200, message: "As discussed" });
    expect(offer.status).toBe("accepted");
    const fromOffer = await quotes.checkout(offer.code);
    expect(orderTotals(fromOffer).total).toBe(200);
  });
});

describe("custom requests (D1)", () => {
  test("client asks for something unlisted, operator prices it, client checks out", async () => {
    const { quotes } = setup();
    const q = await quotes.createCustom({ client, title: "Drone show visuals", description: "3D visuals for a 200-drone launch show.", departmentId: "creative", budget: null, timeline: "6 weeks", region: "intl" });
    expect((await quotes.findByCode(q.code))).toMatchObject({ kind: "custom", title: "Drone show visuals", timeline: "6 weeks" });
    await expect(quotes.respond(q.id, { action: "accept", message: "" })).rejects.toThrow(/counter/i);
    await quotes.respond(q.id, { action: "counter", amount: 2430, message: "Includes 3 revisions" });
    const order = await quotes.checkout(q.code);
    expect(order.departmentId).toBe("creative");
    expect(order.lines).toEqual([{ serviceId: "custom", name: "Custom: Drone show visuals", qty: 1, rateUsd: 2430 }]);
    expect(orderTotals(order).deposit).toBe(1215);
  });
});
