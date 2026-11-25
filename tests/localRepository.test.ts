import { describe, expect, test } from "vitest";
import { createLocalRepository, memoryStore } from "@/lib/data/localRepository";

const client = { name: "Chipo D", company: "", email: "chipo@example.com", whatsapp: "+263 77 123 4567" };

describe("local repository", () => {
  test("seeds five AI workers and demo orders on first read", async () => {
    const repo = createLocalRepository(memoryStore());
    const workers = await repo.listWorkers();
    expect(workers.filter((w) => w.kind === "ai")).toHaveLength(5);
    expect((await repo.listOrders()).length).toBeGreaterThan(0);
  });

  test("creates an order that can be found by its tracking code in any case", async () => {
    const repo = createLocalRepository(memoryStore());
    const order = await repo.createOrder({ client, brief: "Pentest our API", items: [{ serviceId: "sec-pentest", qty: 1 }], region: "intl" as const });
    const found = await repo.findOrderByCode(order.trackingCode.toLowerCase());
    expect(found?.id).toBe(order.id);
    expect(found?.departmentId).toBe("security");
  });

  test("returns null for unknown or malformed codes", async () => {
    const repo = createLocalRepository(memoryStore());
    expect(await repo.findOrderByCode("R1V-ZZZZ-ZZZZ")).toBeNull();
    expect(await repo.findOrderByCode("hello")).toBeNull();
  });

  test("rejects invalid orders with readable errors", async () => {
    const repo = createLocalRepository(memoryStore());
    await expect(repo.createOrder({ client: { ...client, email: "x" }, brief: "", items: [{ serviceId: "sec-audit", qty: 1 }], region: "intl" as const })).rejects.toThrow(/email/i);
  });

  test("issues sequential invoice numbers", async () => {
    const repo = createLocalRepository(memoryStore(), () => new Date("2026-12-01T10:00:00Z"));
    const a = await repo.createOrder({ client, brief: "", items: [{ serviceId: "sec-audit", qty: 1 }], region: "intl" as const });
    const b = await repo.createOrder({ client, brief: "", items: [{ serviceId: "sec-audit", qty: 1 }], region: "intl" as const });
    expect(Number(b.invoiceNo.slice(-3))).toBe(Number(a.invoiceNo.slice(-3)) + 1);
  });

  test("price overrides apply to new orders", async () => {
    const repo = createLocalRepository(memoryStore());
    await repo.updateServicePrice("sec-audit", 400);
    const order = await repo.createOrder({ client, brief: "", items: [{ serviceId: "sec-audit", qty: 1 }], region: "intl" as const });
    expect(order.lines[0].rateUsd).toBe(400);
    await expect(repo.updateServicePrice("sec-audit", -1)).rejects.toThrow();
  });

  test("advances, assigns and persists orders", async () => {
    const store = memoryStore();
    const repo = createLocalRepository(store);
    const order = await repo.createOrder({ client, brief: "", items: [{ serviceId: "cre-motion", qty: 1 }], region: "intl" as const });
    await repo.advanceOrder(order.id, { stage: "in_progress", progress: 40, note: "Storyboard approved" });
    await repo.assignWorker(order.id, "ai-muse");
    const reloaded = await createLocalRepository(store).findOrderByCode(order.trackingCode);
    expect(reloaded?.stage).toBe("in_progress");
    expect(reloaded?.progress).toBe(40);
    expect(reloaded?.assignedWorkerId).toBe("ai-muse");
    await expect(repo.advanceOrder("missing", { stage: "closed", progress: 0, note: "" })).rejects.toThrow(/not found/i);
  });

  test("hires a human employee as invited", async () => {
    const repo = createLocalRepository(memoryStore());
    const w = await repo.hireWorker({ name: "Kuda", role: "Motion designer", departmentId: "creative", email: "kuda@r1vle.com" });
    expect(w.kind).toBe("human");
    expect(w.status).toBe("invited");
    await expect(repo.hireWorker({ name: "", role: "x", departmentId: "hq", email: "" })).rejects.toThrow();
  });

  test("stores attachments and records them on the order", async () => {
    const repo = createLocalRepository(memoryStore());
    const order = await repo.createOrder({ client, brief: "", items: [{ serviceId: "cre-flyer", qty: 2 }], region: "intl" as const });
    const logo = new File(["png-bytes"], "logo.png", { type: "image/png" });
    const updated = await repo.attachFiles(order, [logo]);
    expect(updated.attachments).toEqual([{ key: `${order.id}/0-logo.png`, name: "logo.png", size: 9, type: "image/png" }]);
    const reloaded = await repo.findOrderByCode(order.trackingCode);
    expect(reloaded?.attachments).toHaveLength(1);
    await expect(repo.attachFiles(order, [new File(["x"], "virus.exe")])).rejects.toThrow(/not supported/);
  });

  test("recovers from corrupted storage", async () => {
    const store = memoryStore();
    store.setItem("r1vle-ops-state-v1", "{not json");
    const repo = createLocalRepository(store);
    expect((await repo.listWorkers()).length).toBe(5);
  });
});
