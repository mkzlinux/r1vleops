import type { OrderAdvance } from "../orders";
import type { Quote } from "../quotes";
import type { Attachment, NewOrderInput, NewWorkerInput, Order, Service, Worker } from "../types";
import type { R1vleRepository } from "./repository";

type Fetch = typeof fetch;

/** Error from the R1VLE API; `status` 401 means the operator needs to sign in. */
export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

/** JSON call to our API: unwraps `{ data }`, throws ApiError with the server's message otherwise. */
export function apiCaller(fetcher: Fetch = (...args) => fetch(...args)) {
  return async <T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> => {
    let res: Response;
    try {
      res = await fetcher(path, {
        method: init?.method ?? "GET",
        headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new ApiError(0, "Can't reach R1VLE right now. Check your connection and try again.");
    }
    const payload = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
    if (!res.ok) throw new ApiError(res.status, payload.error ?? "Something went wrong. Please try again.");
    return payload.data as T;
  };
}

/** Talks to the Next.js API routes, which hold the Cloudflare D1/R2 credentials server-side. */
export function createHttpRepository(fetcher: Fetch = (...args) => fetch(...args)): R1vleRepository {
  const call = apiCaller(fetcher);

  return {
    mode: "cloudflare",
    listServices: () => call<Service[]>("/api/services"),
    updateServicePrice: (id, priceUsd) => call<Service>(`/api/ops/services/${encodeURIComponent(id)}`, { method: "PATCH", body: { priceUsd } }),
    createOrder: (input: NewOrderInput) => call<Order>("/api/orders", { method: "POST", body: input }),

    async attachFiles(order: Order, files: readonly File[]): Promise<Order> {
      const meta = files.map((f) => ({ name: f.name, type: f.type, size: f.size }));
      const { uploads } = await call<{ uploads: { key: string; url: string }[] }>(`/api/orders/${encodeURIComponent(order.trackingCode)}/files`, { method: "POST", body: { files: meta } });
      await Promise.all(uploads.map(async (u, i) => {
        const res = await fetcher(u.url, { method: "PUT", body: files[i] });
        if (!res.ok) throw new ApiError(res.status, `Couldn't upload ${files[i].name}. Your order is saved; send the file on WhatsApp instead.`);
      }));
      const attachments: Attachment[] = uploads.map((u, i) => ({ key: u.key, ...meta[i] }));
      return { ...order, attachments: [...(order.attachments ?? []), ...attachments] };
    },

    async openAttachment(att: Attachment): Promise<string | null> {
      const q = new URLSearchParams({ key: att.key, name: att.name });
      return (await call<{ url: string }>(`/api/ops/files?${q}`)).url;
    },

    findOrderByCode: (code) => call<Order | null>(`/api/track/${encodeURIComponent(code.trim())}`),
    createOrderAsOperator: (input, agreedTotal) => call<Order>("/api/ops/orders", { method: "POST", body: { ...input, agreedTotal } }),
    createOffer: (input, terms) => call<Quote>("/api/ops/offers", { method: "POST", body: { client: input.client, items: input.items, region: input.region, brief: input.note, agreedTotal: terms.offerTotal, message: terms.message } }),
    createCustomRequest: (request) => call<Quote>("/api/quotes/custom", { method: "POST", body: request }),
    createQuote: (request) => call<Quote>("/api/quotes", { method: "POST", body: request }),
    findQuote: (code) => call<Quote | null>(`/api/quotes/${encodeURIComponent(code.trim())}`),
    checkoutQuote: (code) => call<Order>(`/api/quotes/${encodeURIComponent(code.trim())}/checkout`, { method: "POST", body: {} }),
    listQuotes: () => call<Quote[]>("/api/ops/quotes"),
    respondToQuote: (id, response) => call<Quote>(`/api/ops/quotes/${encodeURIComponent(id)}`, { method: "PATCH", body: response }),
    findClientOrders: (email, code) => call<Order[]>("/api/clients/orders", { method: "POST", body: { email, code } }),
    listOrders: () => call<Order[]>("/api/ops/orders"),
    advanceOrder: (orderId, change: OrderAdvance) => call<Order>(`/api/ops/orders/${encodeURIComponent(orderId)}`, { method: "PATCH", body: { action: "advance", ...change } }),
    assignWorker: (orderId, workerId) => call<Order>(`/api/ops/orders/${encodeURIComponent(orderId)}`, { method: "PATCH", body: { action: "assign", workerId } }),
    listWorkers: () => call<Worker[]>("/api/ops/workers"),
    hireWorker: (input: NewWorkerInput) => call<Worker>("/api/ops/workers", { method: "POST", body: input }),
  };
}
