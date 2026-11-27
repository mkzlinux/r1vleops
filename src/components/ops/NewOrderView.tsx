"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { priceBucket } from "@/lib/bucket";
import { DEPARTMENTS, maxQtyFor } from "@/lib/catalog";
import { getRepository } from "@/lib/data";
import { clientsFrom } from "@/lib/opsStats";
import { formatUsd, validateNewOrder, whatsappLink } from "@/lib/orders";
import { unitPrice } from "@/lib/pricing";
import type { Client, DepartmentId, OrderItem, Region } from "@/lib/types";
import { ArrowUpRight, Minus, Plus, WhatsApp } from "../Icons";
import { OpsFrame, OpsSky } from "./OpsFrame";
import { useOpsData } from "./useOpsData";

const EMPTY: Client = { name: "", company: "", email: "", whatsapp: "" };
type Result = { kind: "invoice" | "offer"; code: string; total: number; client: Client };

function absolute(path: string): string {
  return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
}

/** Back-office draft: build a bucket for a client, then create the invoice or send it as an offer. */
export function NewOrderView() {
  const { services, orders, quotes, run } = useOpsData();
  const [dept, setDept] = useState<DepartmentId | "all">("all");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [region, setRegion] = useState<Region>("zw");
  const [client, setClient] = useState<Client>(EMPTY);
  const [brief, setBrief] = useState("");
  const [agreed, setAgreed] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const known = useMemo(() => clientsFrom(orders), [orders]);
  const priced = priceBucket(items, services, region);
  const agreedTotal = agreed.trim() === "" ? null : Number(agreed);
  const finalTotal = agreedTotal !== null && Number.isFinite(agreedTotal) ? agreedTotal : priced.total;
  const qtyOf = (id: string) => items.find((i) => i.serviceId === id)?.qty ?? 0;
  const setQty = (id: string, qty: number) =>
    setItems((list) => (qty <= 0 ? list.filter((i) => i.serviceId !== id) : list.some((i) => i.serviceId === id) ? list.map((i) => (i.serviceId === id ? { ...i, qty } : i)) : [...list, { serviceId: id, qty }]));

  const onEmail = (email: string) => {
    const match = known.find((c) => c.email === email.trim().toLowerCase());
    setClient(match ? { name: match.name, company: match.company, email, whatsapp: match.whatsapp } : { ...client, email });
  };

  const submit = (kind: "invoice" | "offer") => async (e?: FormEvent) => {
    e?.preventDefault();
    const input = { client, brief, items, region };
    const problems = validateNewOrder(input);
    if (agreedTotal !== null && (!Number.isFinite(agreedTotal) || agreedTotal <= 0)) problems.push("The agreed total must be a positive number.");
    if (agreedTotal !== null && agreedTotal > priced.total) problems.push("The agreed total can't be above the list price.");
    setErrors(problems);
    if (problems.length > 0) return;
    setIsBusy(true);
    let created: Result | null = null;
    const err = await run(async () => {
      const repo = getRepository();
      if (kind === "invoice") {
        const order = await repo.createOrderAsOperator(input, agreedTotal);
        created = { kind, code: order.trackingCode, total: finalTotal, client };
      } else {
        const q = await repo.createOffer({ client, items, region, note: brief }, { offerTotal: agreedTotal, message });
        created = { kind, code: q.code, total: q.offerTotal ?? finalTotal, client };
      }
    });
    setIsBusy(false);
    if (err) setErrors([err]);
    else if (created) setResult(created);
  };

  const reset = () => { setResult(null); setItems([]); setClient(EMPTY); setBrief(""); setAgreed(""); setMessage(""); setErrors([]); };
  const openDeals = quotes.filter((q) => q.status === "open").length;

  if (result) {
    const path = result.kind === "invoice" ? `/invoice/${result.code}` : `/quote/${result.code}`;
    const first = result.client.name.split(" ")[0];
    const text = result.kind === "invoice"
      ? `Hi ${first}, here's your R1VLE invoice (${formatUsd(result.total)}). Pay the deposit and track progress here: ${absolute(path)}`
      : `Hi ${first}, here's your R1VLE offer for ${formatUsd(result.total)}. Accept it to get your invoice: ${absolute(path)}`;
    return (
      <OpsFrame active="new" alerts={orders.filter((o) => o.stage === "awaiting_deposit").length + openDeals}>
        <div className="new-done">
          <OpsSky className="room-hero" strikeTarget={{ x: 0.8, y: 0.4 }}>
            <span className="ops-chip"><i />{result.kind === "invoice" ? "Invoice created" : "Offer ready"}</span>
            <h1>{result.kind === "invoice" ? "Invoice is live." : "Offer is ready to send."}</h1>
            <p>{result.client.name} · {formatUsd(result.total)} · <span className="mono">{result.code}</span></p>
          </OpsSky>
          <div className="room-panel new-share">
            <p className="dim">Send it to the client:</p>
            <div className="quick">
              {result.client.whatsapp && <a href={whatsappLink(result.client.whatsapp, text)} target="_blank" rel="noopener noreferrer"><WhatsApp size={14} /> WhatsApp</a>}
              <a href={`mailto:${result.client.email}?subject=${encodeURIComponent(result.kind === "invoice" ? "Your R1VLE invoice" : "Your R1VLE offer")}&body=${encodeURIComponent(text)}`}>Email</a>
              <button type="button" onClick={() => navigator.clipboard?.writeText(absolute(path)).catch(() => undefined)}>Copy link</button>
              <a href={path} target="_blank" rel="noopener noreferrer">Open {result.kind === "invoice" ? "invoice" : "offer"}</a>
            </div>
            <div className="new-done-actions">
              <button type="button" className="btn btn-dark" onClick={reset}><span>Create another</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
              <Link href={result.kind === "invoice" ? "/ops" : "/ops/deals"} className="btn btn-light btn-plain">{result.kind === "invoice" ? "Back to overview" : "See in Deals"}</Link>
            </div>
          </div>
        </div>
      </OpsFrame>
    );
  }

  const shown = services.filter((s) => dept === "all" || s.departmentId === dept);
  return (
    <OpsFrame active="new" alerts={orders.filter((o) => o.stage === "awaiting_deposit").length + openDeals}>
      <div className="ops-head">
        <div>
          <span className="eyebrow">Back office</span>
          <h2 className="ops-title">New invoice <span className="accent mark">or offer.</span></h2>
        </div>
      </div>
      <form className="new-grid" onSubmit={submit("invoice")} noValidate>
        <section className="room-panel new-catalog" aria-label="Services">
          <div className="g-tabs" role="tablist">
            {[{ id: "all" as const, name: "Everything" }, ...DEPARTMENTS].map((d) => (
              <button key={d.id} type="button" role="tab" aria-selected={dept === d.id} onClick={() => setDept(d.id)}>{d.name}</button>
            ))}
          </div>
          <div className="g-list new-list">
            {shown.map((s) => {
              const qty = qtyOf(s.id);
              const max = maxQtyFor(s);
              return (
                <div key={s.id} className={`g-row${qty > 0 ? " on" : ""}`}>
                  <div className="g-grow"><b>{s.name}</b><small>{formatUsd(unitPrice(s, region, Math.max(qty, 1)))}{s.unit === "each" ? (s.per ? ` per ${s.per}` : " each") : s.unit === "monthly" ? " / month" : s.unit === "from" ? " from" : ""}</small></div>
                  {qty === 0 ? (
                    <button type="button" className="new-add" onClick={() => setQty(s.id, 1)} aria-label={`Add ${s.name}`}><Plus size={14} /> Add</button>
                  ) : (
                    <div className="new-step" role="group" aria-label={`${s.name} quantity`}>
                      <button type="button" onClick={() => setQty(s.id, qty - 1)} aria-label="Fewer"><Minus size={13} /></button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => setQty(s.id, Math.min(max, qty + 1))} disabled={qty >= max} aria-label="More"><Plus size={13} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="drawer new-summary" aria-label="Draft">
          <div className="g-tabs new-region" role="radiogroup" aria-label="Price list">
            {(["zw", "intl"] as const).map((r) => <button key={r} type="button" role="radio" aria-checked={region === r} aria-selected={region === r} onClick={() => setRegion(r)}>{r === "zw" ? "Zimbabwe prices" : "International"}</button>)}
          </div>
          {priced.lines.length === 0 ? <p className="dim">Add services from the list.</p> : (
            <div className="dr-files">
              {priced.lines.map((l) => <div key={l.service.id} className="dr-pay"><span>{l.qty > 1 ? `${l.qty} × ` : ""}{l.service.name}</span><span>{formatUsd(l.amount)}</span></div>)}
            </div>
          )}
          <div className="dr-kpis">
            <div><b>{formatUsd(priced.total)}</b><small>List</small></div>
            <div><b>{formatUsd(finalTotal)}</b><small>Client pays</small></div>
            <div><b>{formatUsd(finalTotal / 2)}</b><small>Deposit</small></div>
          </div>
          <label className="dr-range">Agreed total (optional)
            <input className="g-input" type="number" inputMode="decimal" min={1} placeholder={`List ${formatUsd(priced.total)}`} value={agreed} onChange={(e) => setAgreed(e.target.value)} />
          </label>

          <div className="g-form">
            <label className="dr-range">Client email
              <input className="g-input" type="email" list="known-clients" autoComplete="off" value={client.email} onChange={(e) => onEmail(e.target.value)} placeholder="Returning clients fill in automatically" />
              <datalist id="known-clients">{known.map((c) => <option key={c.key} value={c.email}>{c.name}</option>)}</datalist>
            </label>
            <div className="dr-row">
              <label className="dr-range">Name<input className="g-input" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} /></label>
              <label className="dr-range">WhatsApp<input className="g-input" type="tel" value={client.whatsapp} onChange={(e) => setClient({ ...client, whatsapp: e.target.value })} placeholder="+263…" /></label>
            </div>
            <label className="dr-range">Company<input className="g-input" value={client.company} onChange={(e) => setClient({ ...client, company: e.target.value })} /></label>
            <label className="dr-range">Brief / notes<textarea className="g-input" value={brief} onChange={(e) => setBrief(e.target.value)} /></label>
            <label className="dr-range">Message with the offer (optional)<input className="g-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="As discussed on our call" /></label>
          </div>

          {errors.length > 0 && <div className="g-error" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
          <button type="submit" className="btn btn-lime new-cta" disabled={isBusy}><span>{isBusy ? "Working…" : "Create invoice now"}</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
          <button type="button" className="btn btn-dark new-cta" disabled={isBusy} onClick={() => void submit("offer")()}><span>Send as offer instead</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
          <p className="dim">An offer lets the client review the bucket and accept with one tap; the invoice is created when they do.</p>
        </aside>
      </form>
    </OpsFrame>
  );
}
