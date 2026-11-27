"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { readClientMemory, rememberClient } from "@/lib/clientMemory";
import { getRepository } from "@/lib/data";
import { formatUsd } from "@/lib/orders";
import { validateQuoteRequest } from "@/lib/quotes";
import type { Client } from "@/lib/types";
import { useBucket } from "../bucket/BucketProvider";
import { ArrowUpRight } from "../Icons";

const EMPTY: Client = { name: "", company: "", email: "", whatsapp: "" };

/** Opens a negotiation ticket for the current bucket (before checkout). */
export function NegotiateForm({ onCancel, onNavigate }: { onCancel: () => void; onNavigate?: () => void }) {
  const router = useRouter();
  const { bucket, priced, region } = useBucket();
  const [client, setClient] = useState<Client>(EMPTY);
  const [budget, setBudget] = useState(String(Math.round(priced.total * 0.85)));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => { const c = readClientMemory().client; if (c) setClient(c); }, []);

  const set = (k: keyof Client) => (v: string) => setClient((c) => ({ ...c, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const request = { client, items: bucket, region, proposedTotal: Number(budget), note };
    const problems = validateQuoteRequest(request, priced.total);
    setErrors(problems);
    if (problems.length > 0) return;
    setIsBusy(true);
    try {
      const q = await getRepository().createQuote(request);
      rememberClient(client);
      onNavigate?.();
      router.push(`/quote/${q.code}?new=1`);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Couldn't open the ticket. Please try again."]);
      setIsBusy(false);
    }
  };

  return (
    <form className="nego" onSubmit={submit} noValidate>
      <div className="nego-head">
        <b>Negotiate this bucket</b>
        <small>List price {formatUsd(priced.total)}. Tell us your budget; we reply with an accept or a counter-offer, usually within a day.</small>
      </div>
      <div className="field">
        <label htmlFor="ng-budget">Your budget (USD)</label>
        <input id="ng-budget" className="input nego-budget" type="number" inputMode="decimal" min={1} step="1" value={budget} onChange={(e) => setBudget(e.target.value)} required />
      </div>
      <div className="nego-grid">
        <div className="field"><label htmlFor="ng-name">Name</label><input id="ng-name" className="input" autoComplete="name" value={client.name} onChange={(e) => set("name")(e.target.value)} required /></div>
        <div className="field"><label htmlFor="ng-email">Email</label><input id="ng-email" className="input" type="email" inputMode="email" autoComplete="email" value={client.email} onChange={(e) => set("email")(e.target.value)} required /></div>
        <div className="field"><label htmlFor="ng-wa">WhatsApp</label><input id="ng-wa" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+263 77 123 4567" value={client.whatsapp} onChange={(e) => set("whatsapp")(e.target.value)} required /></div>
        <div className="field"><label htmlFor="ng-co">Company <small>(optional)</small></label><input id="ng-co" className="input" autoComplete="organization" value={client.company} onChange={(e) => set("company")(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="ng-note">Anything we should know? <small>(optional)</small></label><textarea id="ng-note" className="input" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Deadline, scope you could drop, a competing quote…" /></div>
      {errors.length > 0 && <div className="error-box" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
      <div className="nego-actions">
        <button type="button" className="btn btn-plain nego-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-lime" disabled={isBusy}><span>{isBusy ? "Opening ticket…" : "Open negotiation ticket"}</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
      </div>
    </form>
  );
}
