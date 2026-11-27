import { describe, expect, test } from "vitest";
import { memoryBlobStore } from "@/lib/data/localRepository";
import { createSqlStore } from "@/server/sqlStore";
import { sqliteClient } from "./helpers";

const client = { name: "Rudo M", company: "Harvest", email: "rudo@example.com", whatsapp: "+263 77 123 4567" };
const now = () => new Date("2026-11-26T10:00:00Z");
const store = () => createSqlStore(sqliteClient(), { now, blobs: memoryBlobStore() });

describe("SQL store (Cloudflare D1 schema)", () => {
  test("seeds the five AI workers once and lists catalogue services", async () => {
    const s = store();
    expect((await s.listWorkers()).filter((w) => w.kind === "ai")).toHaveLength(5);
    expect((await s.listWorkers())).toHaveLength(5);
    expect((await s.listServices()).length).toBeGreaterThan(10);
  });

  test("creates orders with server-side prices and sequential invoice numbers", async () => {
    const s = store();
    const a = await s.createOrder({ client, brief: "", items: [{ serviceId: "cre-flyer", qty: 3 }], region: "zw" });
    const b = await s.createOrder({ client, brief: "", items: [{ serviceId: "sec-audit", qty: 1 }], region: "intl" });
    expect(a.lines[0].rateUsd).toBe(17);
    expect(a.invoiceNo).toBe("R1VLE-INV-2026-001");
    expect(b.invoiceNo).toBe("R1VLE-INV-2026-002");
  });

  test("stores the detected country with the order; the phone number doesn't matter", async () => {
    const s = store();
    const o = await s.createOrder({ client: { ...client, whatsapp: "+44 7700 900123" }, brief: "", items: [{ serviceId: "cre-flyer", qty: 1 }], region: "zw", country: "ZW" });
    expect(o.lines[0].rateUsd).toBe(20);
    expect((await s.findOrderByCode(o.trackingCode, { includeContact: true }))?.country).toBe("ZW");
  });

  test("public tracking hides contact details; admin view keeps them", async () => {
    const s = store();
    const o = await s.createOrder({ client, brief: "secret brief", items: [{ serviceId: "cre-logo", qty: 1 }], region: "intl" });
    const pub = await s.findOrderByCode(o.trackingCode.toLowerCase(), { includeContact: false });
    expect(pub?.client.email).toBe("");
    expect(pub?.brief).toBe("");
    const admin = await s.findOrderByCode(o.trackingCode, { includeContact: true });
    expect(admin?.client.email).toBe("rudo@example.com");
  });

  test("advances, assigns and logs updates", async () => {
    const s = store();
    const o = await s.createOrder({ client, brief: "", items: [{ serviceId: "int-site", qty: 1 }], region: "intl" });
    await s.advanceOrder(o.id, { stage: "in_progress", progress: 40, note: "Building" });
    const assigned = await s.assignWorker(o.id, "ai-atlas");
    expect(assigned.stage).toBe("in_progress");
    expect(assigned.progress).toBe(40);
    expect(assigned.assignedWorkerId).toBe("ai-atlas");
    expect(assigned.updates.map((u) => u.note)).toEqual([expect.stringMatching(/invoice/i), "Building"]);
    await expect(s.advanceOrder("nope", { stage: "closed", progress: 0, note: "" })).rejects.toThrow(/not found/i);
  });

  test("price overrides apply to the catalogue and new orders", async () => {
    const s = store();
    await s.updateServicePrice("sec-audit", 420);
    expect((await s.listServices()).find((x) => x.id === "sec-audit")?.priceUsd).toBe(420);
    const o = await s.createOrder({ client, brief: "", items: [{ serviceId: "sec-audit", qty: 1 }], region: "intl" });
    expect(o.lines[0].rateUsd).toBe(420);
    await expect(s.updateServicePrice("unknown", 1)).rejects.toThrow();
  });

  test("stores files for fresh orders only, max 10, and reads them back", async () => {
    const s = store();
    const o = await s.createOrder({ client, brief: "", items: [{ serviceId: "cre-flyer", qty: 1 }], region: "zw" });
    const file = { name: "logo.png", type: "image/png", size: 4, bytes: new Uint8Array([1, 2, 3, 4]) };
    const updated = await s.attachFiles(o.trackingCode, [file]);
    expect(updated.attachments).toHaveLength(1);
    const blob = await s.readAttachment(updated.attachments![0].key);
    expect(blob?.size).toBe(4);
    await expect(s.attachFiles(o.trackingCode, Array.from({ length: 10 }, () => file))).rejects.toThrow(/at most/);

  });

  test("refuses files more than 2 hours after the order was placed", async () => {
    const sql = sqliteClient();
    const blobs = memoryBlobStore();
    const o = await createSqlStore(sql, { now, blobs }).createOrder({ client, brief: "", items: [{ serviceId: "cre-flyer", qty: 1 }], region: "zw" });
    const later = createSqlStore(sql, { now: () => new Date("2026-11-26T12:30:00Z"), blobs });
    const file = { name: "logo.png", type: "image/png", size: 4, bytes: new Uint8Array([1, 2, 3, 4]) };
    await expect(later.attachFiles(o.trackingCode, [file])).rejects.toThrow(/no longer/i);
  });

  test("hires employees as invited", async () => {
    const s = store();
    const w = await s.hireWorker({ name: "Kuda", role: "Motion designer", departmentId: "creative", email: "kuda@r1vle.com" });
    expect(w.status).toBe("invited");
    expect((await s.listWorkers()).some((x) => x.id === w.id)).toBe(true);
  });
  test("reserves upload slots for direct-to-storage uploads without bytes", async () => {
    const s = store();
    const o = await s.createOrder({ client, brief: "", items: [{ serviceId: "cre-logo", qty: 1 }], region: "zw" });
    const { order, added } = await s.reserveAttachments(o.trackingCode, [{ name: "my logo.png", type: "image/png", size: 2_000_000 }]);
    expect(added).toHaveLength(1);
    expect(added[0].key).toMatch(new RegExp(`^${o.id}/0-my-logo\\.png$`));
    expect(order.attachments).toHaveLength(1);
    await expect(s.reserveAttachments(o.trackingCode, [{ name: "x.exe", type: "", size: 10 }])).rejects.toThrow(/not supported/);
  });

  test("files clients by email and shows a client all their orders with email + any one code", async () => {
    const s = store();
    const a = await s.createOrder({ client: { ...client, email: "Rudo@Example.com" }, brief: "", items: [{ serviceId: "cre-logo", qty: 1 }], region: "zw" });
    const b = await s.createOrder({ client: { ...client, name: "Rudo Moyo" }, brief: "", items: [{ serviceId: "cre-flyer", qty: 2 }], region: "zw" });
    await s.createOrder({ client: { ...client, email: "someone@else.com" }, brief: "", items: [{ serviceId: "cre-logo", qty: 1 }], region: "zw" });

    const mine = await s.findClientOrders(" RUDO@example.com", a.trackingCode);
    expect(mine.map((o) => o.id).sort()).toEqual([a.id, b.id].sort());
    expect(await s.findClientOrders("someone@else.com", a.trackingCode)).toEqual([]);
    expect(await s.findClientOrders("rudo@example.com", "R1V-ZZZZ-ZZZZ")).toEqual([]);

    const [row] = await s.sql.query<{ email: string; name: string; order_count: number }>("SELECT email, name, order_count FROM clients WHERE email = ?", ["rudo@example.com"]);
    expect(row).toMatchObject({ email: "rudo@example.com", name: "Rudo Moyo", order_count: 2 });
  });
});
