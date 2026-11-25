"use client";

import { useCallback, useEffect, useState } from "react";
import { getRepository } from "@/lib/data";
import type { Order, Service, Worker } from "@/lib/types";

export interface OpsData {
  readonly orders: readonly Order[];
  readonly workers: readonly Worker[];
  readonly services: readonly Service[];
  readonly isLoading: boolean;
  readonly error: string | null;
  /** Runs a repository mutation, then reloads everything. Resolves to an error message or null. */
  readonly run: (fn: () => Promise<unknown>) => Promise<string | null>;
}

const message = (err: unknown): string => (err instanceof Error ? err.message : "Something went wrong.");

export function useOpsData(): OpsData {
  const [orders, setOrders] = useState<readonly Order[]>([]);
  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [services, setServices] = useState<readonly Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const repo = getRepository();
    try {
      const [o, w, s] = await Promise.all([repo.listOrders(), repo.listWorkers(), repo.listServices()]);
      setOrders(o); setWorkers(w); setServices(s); setError(null);
    } catch (err: unknown) {
      setError(message(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await reload();
      return null;
    } catch (err: unknown) {
      return message(err);
    }
  }, [reload]);

  return { orders, workers, services, isLoading, error, run };
}
