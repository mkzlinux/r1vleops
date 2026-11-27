"use client";

import { useEffect, useRef, useState } from "react";
import { getRepository } from "@/lib/data";
import type { Order } from "@/lib/types";

export type LookupState =
  | { readonly status: "idle" | "loading" }
  | { readonly status: "found"; readonly order: Order }
  | { readonly status: "missing" }
  | { readonly status: "error"; readonly message: string };

/** Loads an order by tracking code. Bump `version` to reload quietly (e.g. after a payment). */
export function useOrderByCode(code: string | null, version = 0): LookupState {
  const [state, setState] = useState<LookupState>({ status: code ? "loading" : "idle" });
  const lastCode = useRef<string | null>(null);
  useEffect(() => {
    if (!code) { setState({ status: "idle" }); return; }
    let cancelled = false;
    if (lastCode.current !== code) setState({ status: "loading" });
    lastCode.current = code;
    getRepository().findOrderByCode(code)
      .then((order) => { if (!cancelled) setState(order ? { status: "found", order } : { status: "missing" }); })
      .catch((err: unknown) => { if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Lookup failed." }); });
    return () => { cancelled = true; };
  }, [code, version]);
  return state;
}
