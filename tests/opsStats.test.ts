import { describe, expect, test } from "vitest";
import { clientsFrom, depositPosition, ordersFor, summarize, weeklyVolume } from "@/lib/opsStats";
import { seedOrders } from "@/lib/data/seed";
import { advanceOrder } from "@/lib/orders";

const orders = seedOrders();

describe("ops stats", () => {
  test("summarize counts requests, active work and pipeline", () => {
    const s = summarize(orders);
    expect(s.requests).toBe(1);
    expect(s.active).toBe(3);
    expect(s.pipelineUsd).toBe(2971); // Zimbabwe list: audit 347 + app 1487 + brand 297 + motion 247 + AI 593
    expect(s.clients).toBe(4);
  });

  test("closed orders leave the pipeline", () => {
    const closed = orders.map((o, i) => (i === 0 ? advanceOrder(o, { stage: "closed", progress: 100, note: "" }, new Date()) : o));
    expect(summarize(closed).pipelineUsd).toBe(2971 - 347);
    expect(summarize(closed).delivered).toBe(1);
  });

  test("ordersFor filters by department", () => {
    expect(ordersFor(orders, "creative")).toHaveLength(1);
    expect(ordersFor(orders, "intelligence")).toHaveLength(2);
  });

  test("clientsFrom merges repeat clients and sorts by value", () => {
    const dup = [...orders, { ...orders[0], id: "x" }];
    const rows = clientsFrom(dup);
    expect(rows[0].name).toBe("Farai Ndlovu");
    expect(rows.find((r) => r.name === "Rudo Chikore")?.orders).toBe(2);
  });

  test("clientsFrom keys clients by email, ignoring case and spaces", () => {
    const base = orders[0];
    const a = { ...base, id: "a1", client: { ...base.client, email: "Tari@Example.com ", name: "Tari" } };
    const b = { ...base, id: "a2", client: { ...base.client, email: "tari@example.com", name: "Tari M" } };
    const rows = clientsFrom([a, b]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "tari@example.com", orders: 2, name: "Tari M" });
    expect(rows[0].orderIds).toEqual(["a1", "a2"]);
  });

  test("depositPosition splits pending from collected", () => {
    expect(depositPosition(orders)).toEqual({ pending: 296.5, collected: 1189 });
  });

  test("weeklyVolume buckets orders by age", () => {
    const v = weeklyVolume(orders, new Date(Date.UTC(2026, 10, 25)), 4);
    expect(v.reduce((a, b) => a + b, 0)).toBe(4);
    expect(v).toHaveLength(4);
  });
});
