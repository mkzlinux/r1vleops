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
    expect(q.listTotal).toBe(490);
    await expect(quotes.checkout(q.code)).rejects.toThrow(/haven't replied/);

    await quotes.respond(q.id, { action: "counter", amount: 400, message: "Meet halfway" });
    const order = await quotes.checkout(q.code);
    expect(orderTotals(order).total).toBe(400);
    expect(order.lines.at(-1)).toMatchObject({ serviceId: "negotiated-discount", rateUsd: -90 });
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
