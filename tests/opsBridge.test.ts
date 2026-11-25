import { describe, expect, test } from "vitest";
import { createOpsBridge } from "@/lib/opsBridge";
import { createLocalRepository, memoryStore } from "@/lib/data/localRepository";

const now = () => new Date(Date.UTC(2026, 10, 25));
const bridge = () => createOpsBridge(createLocalRepository(memoryStore(), now), now);
const call = async (b: ReturnType<typeof bridge>, method: string, payload: unknown = {}) =>
  JSON.parse(await b.request(method, JSON.stringify(payload)));

describe("ops bridge (Godot <-> repository)", () => {
  test("snapshot returns orders, workers, services and per-room stats", async () => {
    const res = await call(bridge(), "snapshot");
    expect(res.ok).toBe(true);
    expect(res.data.workers).toHaveLength(5);
    expect(res.data.services.length).toBeGreaterThan(0);
    expect(res.data.rooms.security.requests).toBe(0);
    expect(res.data.rooms.intelligence.requests).toBe(1);
    expect(res.data.rooms.hq.active).toBe(3);
    expect(res.data.deposits).toEqual({ pending: 300, collected: 1200 });
    expect(res.data.weekly).toHaveLength(10);
    expect(res.data.orders[0].totals.total).toBeGreaterThan(0);
    expect(res.data.stageLabels.awaiting_deposit).toMatch(/deposit/i);
  });

  test("advanceOrder and assignWorker mutate through the repository", async () => {
    const b = bridge();
    const snap = await call(b, "snapshot");
    const order = snap.data.orders.find((o: { stage: string }) => o.stage === "awaiting_deposit");
    const adv = await call(b, "advanceOrder", { orderId: order.id, stage: "deposit_confirmed", progress: 5, note: "Paid" });
    expect(adv.ok).toBe(true);
    expect(adv.data.stage).toBe("deposit_confirmed");
    const asg = await call(b, "assignWorker", { orderId: order.id, workerId: "ai-quant" });
    expect(asg.data.assignedWorkerId).toBe("ai-quant");
  });

  test("hireWorker and updateServicePrice work and validate", async () => {
    const b = bridge();
    expect((await call(b, "hireWorker", { name: "Kuda", role: "Designer", departmentId: "creative", email: "" })).ok).toBe(true);
    expect((await call(b, "hireWorker", { name: "", role: "", departmentId: "creative", email: "" })).ok).toBe(false);
    expect((await call(b, "updateServicePrice", { serviceId: "cre-brand", priceUsd: 320 })).data.priceUsd).toBe(320);
  });

  test("rejects unknown methods, bad JSON and bad payloads without throwing", async () => {
    const b = bridge();
    expect((await call(b, "dropTables")).ok).toBe(false);
    expect(JSON.parse(await b.request("snapshot", "{not json")).ok).toBe(false);
    expect((await call(b, "advanceOrder", { orderId: 5 })).ok).toBe(false);
    expect((await call(b, "advanceOrder", { orderId: "x", stage: "hacked", progress: 1, note: "" })).ok).toBe(false);
  });
});
