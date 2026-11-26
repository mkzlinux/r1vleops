import { SERVICES } from "@/lib/catalog";
import type { BlobStore } from "@/lib/data/localRepository";
import { SEED_WORKERS } from "@/lib/data/seed";
import { MAX_FILES, attachmentKey, validateFiles } from "@/lib/files";
import { advanceOrder as applyAdvance, buildOrder, isValidTrackingCode, normalizeTrackingCode, validateNewOrder, type OrderAdvance } from "@/lib/orders";
import type { Attachment, NewOrderInput, NewWorkerInput, Order, ProjectUpdate, Service, Worker } from "@/lib/types";
import type { SqlClient, SqlValue } from "./sql";

/** A problem with the caller's input or target: safe to show to the user. */
export class StoreError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 = 400) { super(message); }
}

const FILE_WINDOW_MS = 2 * 60 * 60 * 1000;

export interface FileMeta {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export interface UploadFile extends FileMeta {
  readonly bytes: Uint8Array;
}

interface OrderRow {
  id: string; tracking_code: string; invoice_no: string; created_at: string; department_id: Order["departmentId"];
  client: string; brief: string; lines: string; deposit_pct: number; stage: Order["stage"]; progress: number;
  assigned_worker_id: string | null; region: Order["region"]; attachments: string;
}
interface UpdateRow { order_id: string; at: string; stage: Order["stage"]; progress: number; note: string }
interface WorkerRow { id: string; kind: Worker["kind"]; name: string; role: string; department_id: Worker["departmentId"]; email: string; status: Worker["status"]; joined_at: string }

const toWorker = (r: WorkerRow): Worker => ({ id: r.id, kind: r.kind, name: r.name, role: r.role, departmentId: r.department_id, email: r.email, status: r.status, joinedAt: r.joined_at });

function toOrder(r: OrderRow, updates: readonly ProjectUpdate[], includeContact: boolean): Order {
  const client = JSON.parse(r.client) as Order["client"];
  return {
    id: r.id, trackingCode: r.tracking_code, invoiceNo: r.invoice_no, createdAt: r.created_at, departmentId: r.department_id,
    client: includeContact ? client : { name: client.name, company: client.company, email: "", whatsapp: "" },
    brief: includeContact ? r.brief : "",
    lines: JSON.parse(r.lines), depositPct: r.deposit_pct, stage: r.stage, progress: r.progress,
    assignedWorkerId: includeContact ? r.assigned_worker_id : null, region: r.region,
    attachments: JSON.parse(r.attachments) as Attachment[], updates,
  };
}

export interface FindOptions { readonly includeContact: boolean }

/** Server-side store over D1 (or any SqlClient). All prices are computed here, never trusted from the browser. */
export function createSqlStore(sql: SqlClient, deps: { now?: () => Date; blobs: BlobStore }) {
  const now = deps.now ?? (() => new Date());
  let seeded = false;

  const ensureSeeded = async () => {
    if (seeded) return;
    const [{ n }] = await sql.query<{ n: number }>("SELECT COUNT(*) AS n FROM workers");
    if (n === 0) {
      for (const w of SEED_WORKERS) {
        await sql.query("INSERT OR IGNORE INTO workers (id, kind, name, role, department_id, email, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [w.id, w.kind, w.name, w.role, w.departmentId, w.email, w.status, w.joinedAt]);
      }
    }
    seeded = true;
  };

  const updatesFor = async (ids: readonly string[]): Promise<Map<string, ProjectUpdate[]>> => {
    const map = new Map<string, ProjectUpdate[]>();
    if (ids.length === 0) return map;
    const rows = await sql.query<UpdateRow>(`SELECT order_id, at, stage, progress, note FROM order_updates WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY at, id`, ids);
    for (const u of rows) map.set(u.order_id, [...(map.get(u.order_id) ?? []), { at: u.at, stage: u.stage, progress: u.progress, note: u.note }]);
    return map;
  };

  const loadOrder = async (where: string, params: readonly SqlValue[], includeContact: boolean): Promise<Order | null> => {
    const [row] = await sql.query<OrderRow>(`SELECT * FROM orders WHERE ${where} LIMIT 1`, params);
    if (!row) return null;
    const updates = await updatesFor([row.id]);
    return toOrder(row, updates.get(row.id) ?? [], includeContact);
  };

  const requireOrder = async (id: string): Promise<Order> => {
    const o = await loadOrder("id = ?", [id], true);
    if (!o) throw new StoreError("Order not found.", 404);
    return o;
  };

  const listServices = async (): Promise<Service[]> => {
    const overrides = await sql.query<{ service_id: string; price_usd: number }>("SELECT service_id, price_usd FROM price_overrides");
    const map = new Map(overrides.map((o) => [o.service_id, Number(o.price_usd)]));
    return SERVICES.map((s) => (map.has(s.id) ? { ...s, priceUsd: map.get(s.id) as number } : s));
  };

  const insertUpdate = (orderId: string, u: ProjectUpdate) =>
    sql.query("INSERT INTO order_updates (order_id, at, stage, progress, note) VALUES (?, ?, ?, ?, ?)", [orderId, u.at, u.stage, u.progress, u.note]);

  const reserveAttachments = async (code: string, files: readonly FileMeta[]): Promise<{ order: Order; added: Attachment[] }> => {
    const order = await loadOrder("tracking_code = ?", [normalizeTrackingCode(code)], true);
    if (!order || now().getTime() - new Date(order.createdAt).getTime() > FILE_WINDOW_MS) throw new StoreError("Order not found or no longer accepting files.", 404);
    const existing = order.attachments ?? [];
    if (existing.length + files.length > MAX_FILES) throw new StoreError(`You can attach at most ${MAX_FILES} files.`);
    const problems = validateFiles(files);
    if (problems.length > 0) throw new StoreError(problems.join(" "));
    const added: Attachment[] = files.map((f, i) => ({ key: attachmentKey(order.id, existing.length + i, f.name), name: f.name.slice(0, 200), size: f.size, type: f.type.slice(0, 120) }));
    const all = [...existing, ...added];
    await sql.query("UPDATE orders SET attachments = ? WHERE id = ?", [JSON.stringify(all), order.id]);
    return { order: { ...order, attachments: all }, added };
  };

  return {
    sql,
    listServices,

    async updateServicePrice(serviceId: string, priceUsd: number): Promise<Service> {
      const svc = SERVICES.find((s) => s.id === serviceId);
      if (!svc) throw new StoreError("Service not found.", 404);
      if (!Number.isFinite(priceUsd) || priceUsd < 0 || priceUsd > 1_000_000) throw new StoreError("Price must be a positive number.");
      await sql.query("INSERT INTO price_overrides (service_id, price_usd, updated_at) VALUES (?, ?, ?) ON CONFLICT(service_id) DO UPDATE SET price_usd = excluded.price_usd, updated_at = excluded.updated_at",
        [serviceId, priceUsd, now().toISOString()]);
      return { ...svc, priceUsd };
    },

    async createOrder(input: NewOrderInput): Promise<Order> {
      const errors = validateNewOrder(input);
      if (errors.length > 0) throw new StoreError(errors.join(" "));
      const services = await listServices();
      const year = now().getFullYear();
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const existing = await sql.query<{ invoice_no: string }>("SELECT invoice_no FROM orders WHERE invoice_no LIKE ?", [`R1VLE-INV-${year}-%`]);
        const order = buildOrder(input, { services, existingInvoiceNos: existing.map((r) => r.invoice_no), now: now(), random: Math.random });
        try {
          await sql.query(
            "INSERT INTO orders (id, tracking_code, invoice_no, created_at, department_id, client, brief, lines, deposit_pct, stage, progress, assigned_worker_id, region, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, '[]')",
            [order.id, order.trackingCode, order.invoiceNo, order.createdAt, order.departmentId, JSON.stringify(order.client), order.brief, JSON.stringify(order.lines), order.depositPct, order.stage, order.progress, order.region ?? "intl"],
          );
        } catch (err: unknown) {
          if (err instanceof Error && /unique/i.test(err.message) && attempt < 3) continue; // invoice/code collision: retry
          throw err;
        }
        for (const u of order.updates) await insertUpdate(order.id, u);
        return order;
      }
      throw new StoreError("Could not allocate an invoice number. Please try again.");
    },

    async findOrderByCode(code: string, opts: FindOptions): Promise<Order | null> {
      if (!isValidTrackingCode(code)) return null;
      return loadOrder("tracking_code = ?", [normalizeTrackingCode(code)], opts.includeContact);
    },

    async listOrders(): Promise<Order[]> {
      const rows = await sql.query<OrderRow>("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");
      const updates = await updatesFor(rows.map((r) => r.id));
      return rows.map((r) => toOrder(r, updates.get(r.id) ?? [], true));
    },

    async advanceOrder(orderId: string, change: OrderAdvance): Promise<Order> {
      const order = await requireOrder(orderId);
      const next = applyAdvance(order, change, now());
      await sql.query("UPDATE orders SET stage = ?, progress = ? WHERE id = ?", [next.stage, next.progress, orderId]);
      await insertUpdate(orderId, next.updates[next.updates.length - 1]);
      return next;
    },

    async assignWorker(orderId: string, workerId: string | null): Promise<Order> {
      await requireOrder(orderId);
      await ensureSeeded();
      if (workerId) {
        const [w] = await sql.query("SELECT id FROM workers WHERE id = ?", [workerId]);
        if (!w) throw new StoreError("Worker not found.", 404);
      }
      await sql.query("UPDATE orders SET assigned_worker_id = ? WHERE id = ?", [workerId, orderId]);
      return requireOrder(orderId);
    },

    async listWorkers(): Promise<Worker[]> {
      await ensureSeeded();
      return (await sql.query<WorkerRow>("SELECT * FROM workers ORDER BY joined_at, name")).map(toWorker);
    },

    async hireWorker(input: NewWorkerInput): Promise<Worker> {
      if (input.name.trim().length < 2) throw new StoreError("Enter the employee's name.");
      if (input.role.trim().length < 2) throw new StoreError("Enter a role.");
      const worker: Worker = {
        id: `emp_${now().getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind: "human",
        name: input.name.trim().slice(0, 120), role: input.role.trim().slice(0, 120), departmentId: input.departmentId,
        email: input.email.trim().slice(0, 200), status: "invited", joinedAt: now().toISOString(),
      };
      await sql.query("INSERT INTO workers (id, kind, name, role, department_id, email, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [worker.id, worker.kind, worker.name, worker.role, worker.departmentId, worker.email, worker.status, worker.joinedAt]);
      return worker;
    },

    /** Public: record attachment slots on an order placed within the last 2 hours (bytes are uploaded separately). */
    reserveAttachments,

    /** Public: attach client files (bytes included) to a recent order. */
    async attachFiles(code: string, files: readonly UploadFile[]): Promise<Order> {
      const { order, added } = await reserveAttachments(code, files);
      for (const [i, f] of files.entries()) {
        await deps.blobs.put(added[i].key, new Blob([new Uint8Array(f.bytes)], { type: f.type || "application/octet-stream" }));
      }
      return order;
    },

    async readAttachment(key: string): Promise<Blob | null> {
      return deps.blobs.get(key);
    },
  };
}

export type SqlStore = ReturnType<typeof createSqlStore>;
