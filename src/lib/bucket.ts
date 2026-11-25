import { COMPANY, maxQtyFor } from "./catalog";
import { formatUsd } from "./orders";
import type { OrderItem, Service } from "./types";

/** The client's selection on the pricing page, before it becomes an order. */
export type Bucket = readonly OrderItem[];

export interface PricedLine {
  readonly service: Service;
  readonly qty: number;
  readonly amount: number;
}

export interface PricedBucket {
  readonly lines: readonly PricedLine[];
  readonly total: number;
  readonly deposit: number;
  readonly balance: number;
}

const roundCents = (n: number): number => Math.round(n * 100) / 100;

function clampQty(service: Service, qty: number): number {
  return Math.max(0, Math.min(maxQtyFor(service), Math.floor(qty)));
}

export function setBucketQty(bucket: Bucket, serviceId: string, qty: number, services: readonly Service[]): Bucket {
  const service = services.find((s) => s.id === serviceId);
  if (!service || !Number.isFinite(qty)) return bucket;
  const next = clampQty(service, qty);
  const exists = bucket.some((l) => l.serviceId === serviceId);
  if (next === 0) return bucket.filter((l) => l.serviceId !== serviceId);
  return exists
    ? bucket.map((l) => (l.serviceId === serviceId ? { ...l, qty: next } : l))
    : [...bucket, { serviceId, qty: next }];
}

export function addToBucket(bucket: Bucket, serviceId: string, services: readonly Service[], qty = 1): Bucket {
  const current = bucket.find((l) => l.serviceId === serviceId)?.qty ?? 0;
  return setBucketQty(bucket, serviceId, current + qty, services);
}

export function removeFromBucket(bucket: Bucket, serviceId: string): Bucket {
  return bucket.filter((l) => l.serviceId !== serviceId);
}

export function bucketCount(bucket: Bucket): number {
  return bucket.reduce((n, l) => n + l.qty, 0);
}

export function priceBucket(bucket: Bucket, services: readonly Service[]): PricedBucket {
  const lines: PricedLine[] = bucket.flatMap((l) => {
    const service = services.find((s) => s.id === l.serviceId);
    return service ? [{ service, qty: l.qty, amount: roundCents(service.priceUsd * l.qty) }] : [];
  });
  const total = roundCents(lines.reduce((sum, l) => sum + l.amount, 0));
  const deposit = roundCents((total * COMPANY.depositPct) / 100);
  return { lines, total, deposit, balance: roundCents(total - deposit) };
}

/** Reads a bucket from storage or a URL, dropping anything malformed. */
export function parseBucket(raw: string | null): Bucket {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.flatMap((x: unknown) => {
      if (typeof x !== "object" || x === null) return [];
      const { serviceId, qty } = x as Record<string, unknown>;
      if (typeof serviceId !== "string" || typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 50) return [];
      return [{ serviceId, qty }];
    });
  } catch {
    return [];
  }
}

export function bucketWhatsappMessage(bucket: Bucket, services: readonly Service[]): string {
  const priced = priceBucket(bucket, services);
  const lines = priced.lines.map((l) => `• ${l.qty} × ${l.service.name} — ${formatUsd(l.amount)}`);
  return [`Hi ${COMPANY.name}, I'd like to negotiate this bucket:`, ...lines, `Listed total: ${formatUsd(priced.total)}`].join("\n");
}
