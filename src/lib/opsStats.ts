import { orderTotals } from "./orders";
import type { DepartmentId, Order, Stage } from "./types";

const ACTIVE: readonly Stage[] = ["deposit_confirmed", "in_progress", "in_review"];

export interface DeptSummary {
  readonly requests: number;
  readonly active: number;
  readonly delivered: number;
  readonly pipelineUsd: number;
  readonly clients: number;
}

export function isActive(o: Order): boolean {
  return ACTIVE.includes(o.stage);
}

export function summarize(orders: readonly Order[]): DeptSummary {
  const open = orders.filter((o) => o.stage !== "closed");
  return {
    requests: orders.filter((o) => o.stage === "awaiting_deposit").length,
    active: orders.filter(isActive).length,
    delivered: orders.filter((o) => o.stage === "delivered" || o.stage === "closed").length,
    pipelineUsd: open.reduce((sum, o) => sum + orderTotals(o).total, 0),
    clients: new Set(orders.map((o) => (o.client.email || o.client.name).toLowerCase())).size,
  };
}

export function ordersFor(orders: readonly Order[], dept: DepartmentId): Order[] {
  return orders.filter((o) => o.departmentId === dept);
}

export interface ClientRow {
  readonly key: string;
  readonly name: string;
  readonly company: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly orders: number;
  readonly lifetimeUsd: number;
}

/** Groups orders into one row per client, most valuable first. */
export function clientsFrom(orders: readonly Order[]): ClientRow[] {
  const map = new Map<string, ClientRow>();
  for (const o of orders) {
    const key = (o.client.email || o.client.name).toLowerCase();
    const prev = map.get(key);
    const value = orderTotals(o).total;
    map.set(key, prev
      ? { ...prev, orders: prev.orders + 1, lifetimeUsd: prev.lifetimeUsd + value }
      : { key, name: o.client.name, company: o.client.company, whatsapp: o.client.whatsapp, email: o.client.email, orders: 1, lifetimeUsd: value });
  }
  return [...map.values()].sort((a, b) => b.lifetimeUsd - a.lifetimeUsd);
}

/** Deposits expected (awaiting) and already collected (confirmed onwards), in USD. */
export function depositPosition(orders: readonly Order[]): { readonly pending: number; readonly collected: number } {
  return orders.reduce(
    (acc, o) => {
      const { deposit } = orderTotals(o);
      return o.stage === "awaiting_deposit"
        ? { ...acc, pending: acc.pending + deposit }
        : { ...acc, collected: acc.collected + deposit };
    },
    { pending: 0, collected: 0 },
  );
}

/** Orders created per week for the last `weeks` weeks (oldest first), for sparkline bars. */
export function weeklyVolume(orders: readonly Order[], now: Date, weeks = 10): number[] {
  const week = 7 * 24 * 3600 * 1000;
  const buckets = Array.from({ length: weeks }, () => 0);
  for (const o of orders) {
    const age = Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / week);
    if (age >= 0 && age < weeks) buckets[weeks - 1 - age] += 1;
  }
  return buckets;
}
