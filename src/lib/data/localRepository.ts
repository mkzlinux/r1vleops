import { SERVICES } from "../catalog";
import { advanceOrder, buildOrder, isValidTrackingCode, normalizeTrackingCode, validateNewOrder } from "../orders";
import type { OrderAdvance } from "../orders";
import { attachmentKey, validateFiles } from "../files";
import type { Attachment, NewOrderInput, NewWorkerInput, Order, Service, Worker } from "../types";
import type { R1vleRepository } from "./repository";
import { SEED_WORKERS, seedOrders } from "./seed";

/** Minimal key/value storage so the repository works with localStorage or an in-memory map in tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface LocalState {
  readonly version: 1;
  readonly priceOverrides: Readonly<Record<string, number>>;
  readonly orders: readonly Order[];
  readonly workers: readonly Worker[];
}

const STATE_KEY = "r1vle-ops-state-v1";

/** Binary storage for attachments (IndexedDB in the browser, a Map in tests). */
export interface BlobStore {
  put(key: string, blob: Blob): Promise<void>;
  get(key: string): Promise<Blob | null>;
}

export function memoryBlobStore(): BlobStore {
  const map = new Map<string, Blob>();
  return { put: async (k, b) => void map.set(k, b), get: async (k) => map.get(k) ?? null };
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

function freshState(): LocalState {
  return { version: 1, priceOverrides: {}, orders: seedOrders(), workers: [...SEED_WORKERS] };
}

function isLocalState(value: unknown): value is LocalState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<LocalState>;
  return v.version === 1 && Array.isArray(v.orders) && Array.isArray(v.workers) && typeof v.priceOverrides === "object";
}

export function createLocalRepository(
  store: KeyValueStore,
  now: () => Date = () => new Date(),
  blobs: BlobStore = memoryBlobStore(),
): R1vleRepository {
  const read = (): LocalState => {
    try {
      const raw = store.getItem(STATE_KEY);
      if (!raw) return freshState();
      const parsed: unknown = JSON.parse(raw);
      return isLocalState(parsed) ? parsed : freshState();
    } catch {
      return freshState();
    }
  };
  const write = (state: LocalState): void => {
    try {
      store.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      throw new Error("Could not save to this browser's storage. Private mode or full storage may be blocking it.");
    }
  };
  const services = (state: LocalState): Service[] =>
    SERVICES.map((s) => (s.id in state.priceOverrides ? { ...s, priceUsd: state.priceOverrides[s.id] } : s));
  const replaceOrder = (orderId: string, fn: (o: Order) => Order): Order => {
    const state = read();
    const existing = state.orders.find((o) => o.id === orderId);
    if (!existing) throw new Error("Order not found.");
    const updated = fn(existing);
    write({ ...state, orders: state.orders.map((o) => (o.id === orderId ? updated : o)) });
    return updated;
  };

  return {
    mode: "local",
    async listServices() {
      return services(read());
    },
    async updateServicePrice(serviceId, priceUsd) {
      if (!Number.isFinite(priceUsd) || priceUsd < 0) throw new Error("Price must be a positive number.");
      const state = read();
      const svc = SERVICES.find((s) => s.id === serviceId);
      if (!svc) throw new Error("Service not found.");
      write({ ...state, priceOverrides: { ...state.priceOverrides, [serviceId]: priceUsd } });
      return { ...svc, priceUsd };
    },
    async createOrder(input: NewOrderInput) {
      const errors = validateNewOrder(input);
      if (errors.length > 0) throw new Error(errors.join(" "));
      const state = read();
      const order = buildOrder(input, {
        services: services(state),
        existingInvoiceNos: state.orders.map((o) => o.invoiceNo),
        now: now(),
        random: Math.random,
      });
      write({ ...state, orders: [order, ...state.orders] });
      return order;
    },
    async attachFiles(order: Order, files: readonly File[]) {
      if (files.length === 0) return order;
      const problems = validateFiles(files);
      if (problems.length > 0) throw new Error(problems.join(" "));
      const attachments: Attachment[] = [];
      for (const [i, file] of files.entries()) {
        const key = attachmentKey(order.id, i, file.name);
        await blobs.put(key, file);
        attachments.push({ key, name: file.name, size: file.size, type: file.type });
      }
      return replaceOrder(order.id, (o) => ({ ...o, attachments: [...(o.attachments ?? []), ...attachments] }));
    },
    async openAttachment(attachment: Attachment) {
      const blob = await blobs.get(attachment.key);
      return blob ? URL.createObjectURL(blob) : null;
    },
    async findOrderByCode(code) {
      if (!isValidTrackingCode(code)) return null;
      const wanted = normalizeTrackingCode(code);
      return read().orders.find((o) => o.trackingCode === wanted) ?? null;
    },
    async listOrders() {
      return [...read().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async advanceOrder(orderId, change: OrderAdvance) {
      return replaceOrder(orderId, (o) => advanceOrder(o, change, now()));
    },
    async assignWorker(orderId, workerId) {
      return replaceOrder(orderId, (o) => ({ ...o, assignedWorkerId: workerId }));
    },
    async listWorkers() {
      return [...read().workers];
    },
    async hireWorker(input: NewWorkerInput) {
      if (input.name.trim().length < 2) throw new Error("Enter the employee's name.");
      if (input.role.trim().length < 2) throw new Error("Enter a role.");
      const state = read();
      const worker: Worker = {
        id: `emp_${now().getTime().toString(36)}`,
        kind: "human",
        name: input.name.trim(),
        role: input.role.trim(),
        departmentId: input.departmentId,
        email: input.email.trim(),
        status: "invited",
        joinedAt: now().toISOString(),
      };
      write({ ...state, workers: [...state.workers, worker] });
      return worker;
    },
  };
}
