import type { SupabaseClient } from "@supabase/supabase-js";
import { stageLabel, type OrderAdvance } from "../orders";
import { attachmentKey, validateFiles } from "../files";
import type { Attachment, DepartmentId, NewOrderInput, NewWorkerInput, Order, PriceUnit, Service, Worker } from "../types";
import type { R1vleRepository } from "./repository";

interface ServiceRow {
  id: string; department_id: DepartmentId; name: string; summary: string; price_usd: number | string;
  unit: PriceUnit; delivery_days: number; includes: string[]; regional: Service["regional"] | null;
}
interface WorkerRow {
  id: string; kind: Worker["kind"]; name: string; role: string; department_id: Worker["departmentId"];
  email: string; status: Worker["status"]; joined_at: string;
}
interface OrderRow {
  id: string; tracking_code: string; invoice_no: string; created_at: string; department_id: DepartmentId;
  client: Order["client"]; brief: string; lines: Order["lines"]; deposit_pct: number; stage: Order["stage"];
  progress: number; assigned_worker_id: string | null; attachments: Attachment[] | null; region: Order["region"];
  order_updates: { at: string; stage: Order["stage"]; progress: number; note: string }[];
}

const FILES_BUCKET = "order-files";
const ORDER_SELECT = "*, order_updates(at, stage, progress, note)";

const toService = (r: ServiceRow): Service => ({
  id: r.id, departmentId: r.department_id, name: r.name, summary: r.summary, priceUsd: Number(r.price_usd),
  unit: r.unit, deliveryDays: r.delivery_days, includes: r.includes, regional: r.regional ?? undefined,
});
const toWorker = (r: WorkerRow): Worker => ({
  id: r.id, kind: r.kind, name: r.name, role: r.role, departmentId: r.department_id, email: r.email,
  status: r.status, joinedAt: r.joined_at,
});
const toOrder = (r: OrderRow): Order => ({
  id: r.id, trackingCode: r.tracking_code, invoiceNo: r.invoice_no, createdAt: r.created_at,
  departmentId: r.department_id, client: r.client, brief: r.brief,
  lines: r.lines.map((l) => ({ ...l, rateUsd: Number(l.rateUsd) })), depositPct: r.deposit_pct,
  stage: r.stage, progress: r.progress, assignedWorkerId: r.assigned_worker_id,
  updates: [...(r.order_updates ?? [])].sort((a, b) => a.at.localeCompare(b.at)),
  attachments: r.attachments ?? [],
  region: r.region,
});

function fail(action: string, error: { message: string } | null): never {
  throw new Error(error?.message ? `${action}: ${error.message}` : `${action} failed.`);
}

export function createSupabaseRepository(db: SupabaseClient): R1vleRepository {
  const loadOrder = async (id: string): Promise<Order> => {
    const { data, error } = await db.from("orders").select(ORDER_SELECT).eq("id", id).single<OrderRow>();
    if (error || !data) fail("Could not load order", error);
    return toOrder(data);
  };

  return {
    mode: "supabase",
    async listServices() {
      const { data, error } = await db.from("services").select("*").order("sort");
      if (error) fail("Could not load services", error);
      return (data as ServiceRow[]).map(toService);
    },
    async updateServicePrice(serviceId, priceUsd) {
      if (!Number.isFinite(priceUsd) || priceUsd < 0) throw new Error("Price must be a positive number.");
      const { data, error } = await db.from("services").update({ price_usd: priceUsd }).eq("id", serviceId).select().single<ServiceRow>();
      if (error || !data) fail("Could not update price", error);
      return toService(data);
    },
    async createOrder(input: NewOrderInput) {
      const { data, error } = await db.rpc("create_order", {
        p_client: input.client, p_brief: input.brief, p_items: input.items, p_region: input.region,
      });
      if (error || !data) fail("Could not place order", error);
      return data as Order;
    },
    async attachFiles(order: Order, files: readonly File[]) {
      if (files.length === 0) return order;
      const problems = validateFiles(files);
      if (problems.length > 0) throw new Error(problems.join(" "));
      const attachments: Attachment[] = [];
      for (const [i, file] of files.entries()) {
        const key = attachmentKey(order.id, i, file.name);
        const { error } = await db.storage.from(FILES_BUCKET).upload(key, file, { contentType: file.type || undefined, upsert: false });
        if (error) fail(`Could not upload ${file.name}`, error);
        attachments.push({ key, name: file.name, size: file.size, type: file.type });
      }
      const { data, error } = await db.rpc("attach_files", { p_code: order.trackingCode, p_attachments: attachments });
      if (error || !data) fail("Could not save attachments", error);
      return data as Order;
    },
    async openAttachment(attachment: Attachment) {
      const { data, error } = await db.storage.from(FILES_BUCKET).createSignedUrl(attachment.key, 600);
      return error || !data ? null : data.signedUrl;
    },
    async createOrderAsOperator(): Promise<never> { throw new Error("Dashboard invoices need the Cloudflare backend."); },
    async createOffer(): Promise<never> { throw new Error("Dashboard offers need the Cloudflare backend."); },
    async createCustomRequest(): Promise<never> { throw new Error("Custom requests need the Cloudflare backend."); },
    async createQuote(): Promise<never> { throw new Error("Negotiation tickets need the Cloudflare backend."); },
    async findQuote() { return null; },
    async checkoutQuote(): Promise<never> { throw new Error("Negotiation tickets need the Cloudflare backend."); },
    async listQuotes() { return []; },
    async respondToQuote(): Promise<never> { throw new Error("Negotiation tickets need the Cloudflare backend."); },
    async findClientOrders() {
      throw new Error("Order history is available on the Cloudflare backend.");
    },
    async findOrderByCode(code) {
      const { data, error } = await db.rpc("track_order", { p_code: code });
      if (error) fail("Could not look up code", error);
      return (data as Order | null) ?? null;
    },
    async listOrders() {
      const { data, error } = await db.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(500);
      if (error) fail("Could not load orders", error);
      return (data as OrderRow[]).map(toOrder);
    },
    async advanceOrder(orderId, change: OrderAdvance) {
      const forcedFull = change.stage === "delivered" || change.stage === "closed";
      const progress = forcedFull ? 100 : Math.min(100, Math.max(0, Math.round(change.progress)));
      const upd = await db.from("orders").update({ stage: change.stage, progress }).eq("id", orderId);
      if (upd.error) fail("Could not update order", upd.error);
      const log = await db.from("order_updates").insert({
        order_id: orderId, stage: change.stage, progress, note: change.note.trim() || stageLabel(change.stage),
      });
      if (log.error) fail("Could not log update", log.error);
      return loadOrder(orderId);
    },
    async assignWorker(orderId, workerId) {
      const { error } = await db.from("orders").update({ assigned_worker_id: workerId }).eq("id", orderId);
      if (error) fail("Could not assign worker", error);
      return loadOrder(orderId);
    },
    async listWorkers() {
      const { data, error } = await db.from("workers").select("*").order("joined_at");
      if (error) fail("Could not load team", error);
      return (data as WorkerRow[]).map(toWorker);
    },
    async hireWorker(input: NewWorkerInput) {
      if (input.name.trim().length < 2) throw new Error("Enter the employee's name.");
      const row = {
        id: `emp_${Date.now().toString(36)}`, kind: "human", name: input.name.trim(), role: input.role.trim(),
        department_id: input.departmentId, email: input.email.trim(), status: "invited",
      };
      const { data, error } = await db.from("workers").insert(row).select().single<WorkerRow>();
      if (error || !data) fail("Could not add employee", error);
      return toWorker(data);
    },
  };
}
