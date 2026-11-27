"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addToBucket, bucketCount, parseBucket, priceBucket, removeFromBucket, setBucketQty, type Bucket, type PricedBucket } from "@/lib/bucket";
import { SERVICES } from "@/lib/catalog";
import { getRepository } from "@/lib/data";
import { regionFromCountry } from "@/lib/pricing";
import type { Region, Service } from "@/lib/types";
import { flyToBucket } from "./flyToBucket";

const STORAGE_KEY = "r1vle-bucket-v1";

interface BucketContextValue {
  readonly bucket: Bucket;
  readonly services: readonly Service[];
  readonly priced: PricedBucket;
  readonly count: number;
  /** Increments every time something lands in the bucket, so icons can play a bump animation. */
  readonly pulse: number;
  /** Price list in use: decided by the visitor's location (IP), never by the browser. */
  readonly region: Region;
  /** Country detected from the visitor's IP (null when unknown). */
  readonly country: string | null;
  add(serviceId: string, from?: HTMLElement | null): void;
  setQty(serviceId: string, qty: number): void;
  remove(serviceId: string): void;
  clear(): void;
  qtyOf(serviceId: string): number;
}

const BucketContext = createContext<BucketContextValue | null>(null);

function readStored(): Bucket {
  try {
    return parseBucket(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function BucketProvider({ children }: { children: ReactNode }) {
  const [bucket, setBucket] = useState<Bucket>([]);
  const [services, setServices] = useState<readonly Service[]>(SERVICES);
  const [pulse, setPulse] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  // Price list follows the visitor's location (server-side IP geolocation). It can't be switched
  // in the browser, and the server applies the same rule when an order or ticket is placed.
  const [region, setRegion] = useState<Region>("intl");
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/region")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { country?: string | null } | null) => { setCountry(d?.country ?? null); setRegion(regionFromCountry(d?.country)); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setBucket(readStored());
    setIsLoaded(true);
    let cancelled = false;
    getRepository().listServices().then((list) => { if (!cancelled && list.length) setServices(list); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bucket)); } catch { /* storage unavailable: bucket lives for this tab only */ }
  }, [bucket, isLoaded]);

  const add = useCallback((serviceId: string, from?: HTMLElement | null) => {
    setBucket((b) => addToBucket(b, serviceId, services));
    void flyToBucket(from ?? null).then(() => setPulse((p) => p + 1));
  }, [services]);

  const value = useMemo<BucketContextValue>(() => ({
    bucket,
    services,
    priced: priceBucket(bucket, services, region),
    region,
    country,
    count: bucketCount(bucket),
    pulse,
    add,
    setQty: (id, qty) => setBucket((b) => setBucketQty(b, id, qty, services)),
    remove: (id) => setBucket((b) => removeFromBucket(b, id)),
    clear: () => setBucket([]),
    qtyOf: (id) => bucket.find((l) => l.serviceId === id)?.qty ?? 0,
  }), [bucket, services, pulse, add, region, country]);

  return <BucketContext.Provider value={value}>{children}</BucketContext.Provider>;
}

export function useBucket(): BucketContextValue {
  const ctx = useContext(BucketContext);
  if (!ctx) throw new Error("useBucket must be used inside <BucketProvider>.");
  return ctx;
}
