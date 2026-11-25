"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/data";
import type { Order } from "@/lib/types";

export type LookupState =
  | { readonly status: "idle" | "loading" }
  | { readonly status: "found"; readonly order: Order }
  | { readonly status: "missing" }
  | { readonly status: "error"; readonly message: string };

/** Loads an order by tracking code. Shared by the invoice and tracking pages. */
export function useOrderByCode(code: string | null): LookupState {
  const [state, setState] = useState<LookupState>({ status: code ? "loading" : "idle" });
  useEffect(() => {
    if (!code) { setState({ status: "idle" }); return; }
    let cancelled = false;
    setState({ status: "loading" });
    getRepository().findOrderByCode(code)
      .then((order) => { if (!cancelled) setState(order ? { status: "found", order } : { status: "missing" }); })
      .catch((err: unknown) => { if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Lookup failed." }); });
    return () => { cancelled = true; };
  }, [code]);
  return state;
}
