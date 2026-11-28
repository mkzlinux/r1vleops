import type { Attachment, NewOrderInput, NewWorkerInput, Order, Service, Worker } from "../types";
import type { OrderAdvance } from "../orders";
import type { CustomRequest, OfferInput, Quote, QuoteRequest, QuoteResponse } from "../quotes";

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
  /** A client's full history: every order under `email`, only if `code` is one of their tracking codes. */
  findClientOrders(email: string, code: string): Promise<Order[]>;
  listOrders(): Promise<Order[]>;
  advanceOrder(orderId: string, change: OrderAdvance): Promise<Order>;
  assignWorker(orderId: string, workerId: string | null): Promise<Order>;
  listWorkers(): Promise<Worker[]>;
  /** Negotiation tickets: client proposes a budget; operator accepts, counters or declines. */
  createQuote(request: QuoteRequest): Promise<Quote>;
  /** A request for something not on the price list (priced by the operator). */
  createCustomRequest(request: CustomRequest): Promise<Quote>;
  findQuote(code: string): Promise<Quote | null>;
  /** Client takes the agreed price: creates the order (idempotent). */
  checkoutQuote(code: string): Promise<Order>;
  listQuotes(): Promise<Quote[]>;
  respondToQuote(id: string, response: QuoteResponse): Promise<Quote>;
  /** Operator: invoice created from the dashboard (any price list; optional agreed total below list). */
  createOrderAsOperator(input: NewOrderInput, agreedTotal: number | null): Promise<Order>;
  /** Operator: a bucket sent to a client as an offer they accept with one tap. */
  createOffer(input: OfferInput, terms: { offerTotal: number | null; message: string }): Promise<Quote>;
  hireWorker(input: NewWorkerInput): Promise<Worker>;
}
