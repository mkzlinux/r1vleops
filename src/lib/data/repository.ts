import type { Attachment, NewOrderInput, NewWorkerInput, Order, Service, Worker } from "../types";
import type { OrderAdvance } from "../orders";

/**
 * Storage boundary for the whole app. Pages depend only on this interface;
 * `local` keeps data in the browser (demo), `cloudflare` calls our API (D1 + R2), `supabase` uses Supabase.
 */
export interface R1vleRepository {
  readonly mode: "local" | "supabase" | "cloudflare";
  listServices(): Promise<Service[]>;
  updateServicePrice(serviceId: string, priceUsd: number): Promise<Service>;
  createOrder(input: NewOrderInput): Promise<Order>;
  /** Stores client files for a just-created order and records them on it. */
  attachFiles(order: Order, files: readonly File[]): Promise<Order>;
  /** A URL the operator can open to view/download an attachment, or null if unavailable. */
  openAttachment(attachment: Attachment): Promise<string | null>;
  findOrderByCode(code: string): Promise<Order | null>;
  listOrders(): Promise<Order[]>;
  advanceOrder(orderId: string, change: OrderAdvance): Promise<Order>;
  assignWorker(orderId: string, workerId: string | null): Promise<Order>;
  listWorkers(): Promise<Worker[]>;
  hireWorker(input: NewWorkerInput): Promise<Worker>;
}
