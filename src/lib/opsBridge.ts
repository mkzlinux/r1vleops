import { DEPARTMENTS } from "./catalog";
import type { R1vleRepository } from "./data/repository";
import { orderTotals, STAGE_LABELS } from "./orders";
import { clientsFrom, depositPosition, ordersFor, summarize, weeklyVolume } from "./opsStats";
import { STAGES, type DepartmentId, type Stage, type Worker } from "./types";

/**
 * JSON request/response bridge between the Godot ops dashboard and the repository.
 * Godot sends (method, payloadJson) and always receives {"ok":true,"data":…} or {"ok":false,"error":"…"}.
 * Business rules stay here in TypeScript; Godot is only the view.
 */
export interface OpsBridge {
  request(method: string, payloadJson: string): Promise<string>;
}

type Payload = Record<string, unknown>;
type Handler = (p: Payload) => Promise<unknown>;

const ROOM_IDS = ["security", "intelligence", "creative", "hq"] as const;
const WORKER_DEPTS: readonly Worker["departmentId"][] = ["security", "intelligence", "creative", "hq"];

function str(p: Payload, key: string, opts: { allowEmpty?: boolean } = {}): string {
  const v = p[key];
  if (typeof v !== "string" || (!opts.allowEmpty && v.length === 0)) throw new Error(`Invalid "${key}".`);
  return v;
}

function num(p: Payload, key: string): number {
  const v = p[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`Invalid "${key}".`);
  return v;
}

function oneOf<T extends string>(value: string, allowed: readonly T[], key: string): T {
  if (!(allowed as readonly string[]).includes(value)) throw new Error(`Invalid "${key}".`);
  return value as T;
}

export function createOpsBridge(repo: R1vleRepository, now: () => Date = () => new Date()): OpsBridge {
  const snapshot = async () => {
    const [orders, workers, services] = await Promise.all([repo.listOrders(), repo.listWorkers(), repo.listServices()]);
    const rooms = Object.fromEntries(ROOM_IDS.map((id) => {
      const scoped = id === "hq" ? orders : ordersFor(orders, id as DepartmentId);
      return [id, { ...summarize(scoped), clients: clientsFrom(scoped) }];
    }));
    return {
      mode: repo.mode,
      orders: orders.map((o) => ({ ...o, totals: orderTotals(o) })),
      workers,
      services,
      rooms,
      deposits: depositPosition(orders),
      weekly: weeklyVolume(orders, now(), 10),
      stages: STAGES,
      stageLabels: STAGE_LABELS,
      departments: DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, accent: d.accent, tagline: d.tagline })),
    };
  };

  const handlers: Record<string, Handler> = {
    snapshot,
    advanceOrder: async (p) => {
      const stage = oneOf<Stage>(str(p, "stage"), STAGES, "stage");
      return repo.advanceOrder(str(p, "orderId"), { stage, progress: num(p, "progress"), note: str(p, "note", { allowEmpty: true }) });
    },
    assignWorker: async (p) => {
      const workerId = p.workerId === null || p.workerId === "" ? null : str(p, "workerId");
      return repo.assignWorker(str(p, "orderId"), workerId);
    },
    hireWorker: async (p) => repo.hireWorker({
      name: str(p, "name", { allowEmpty: true }),
      role: str(p, "role", { allowEmpty: true }),
      departmentId: oneOf(str(p, "departmentId"), WORKER_DEPTS, "departmentId"),
      email: str(p, "email", { allowEmpty: true }),
    }),
    updateServicePrice: async (p) => repo.updateServicePrice(str(p, "serviceId"), num(p, "priceUsd")),
  };

  return {
    async request(method, payloadJson) {
      try {
        const handler = Object.prototype.hasOwnProperty.call(handlers, method) ? handlers[method] : undefined;
        if (!handler) throw new Error(`Unknown method "${method}".`);
        const parsed: unknown = payloadJson ? JSON.parse(payloadJson) : {};
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Payload must be an object.");
        return JSON.stringify({ ok: true, data: await handler(parsed as Payload) });
      } catch (err: unknown) {
        return JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Request failed." });
      }
    },
  };
}
