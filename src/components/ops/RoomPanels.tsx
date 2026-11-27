"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { DEPARTMENTS } from "@/lib/catalog";
import { getRepository } from "@/lib/data";
import { formatBytes } from "@/lib/files";
import { formatUsd, orderTotals, stageLabel, whatsappLink, type OrderAdvance } from "@/lib/orders";
import type { ClientRow } from "@/lib/opsStats";
import { STAGES, type NewWorkerInput, type Order, type Service, type Stage, type Worker } from "@/lib/types";
import { Bot, Close, Users, WhatsApp } from "../Icons";

const QUICK: readonly { stage: Stage; progress: number; label: string; note: string }[] = [
  { stage: "deposit_confirmed", progress: 5, label: "Confirm deposit", note: "Deposit received. Work is scheduled." },
  { stage: "in_progress", progress: 15, label: "Start work", note: "Work has started." },
  { stage: "in_review", progress: 85, label: "Send for review", note: "First delivery sent for your review." },
  { stage: "delivered", progress: 100, label: "Mark delivered", note: "Final files delivered. Balance due." },
  { stage: "closed", progress: 100, label: "Balance paid · close", note: "Balance received. Thank you!" },
];

interface DrawerProps {
  readonly order: Order;
  readonly workers: readonly Worker[];
  readonly onClose: () => void;
  readonly onAdvance: (change: OrderAdvance) => Promise<string | null>;
  readonly onAssign: (workerId: string | null) => Promise<string | null>;
  /** Re-checks a pending online payment (Paynow / blockchain). */
  readonly onRecheck?: (paymentId: string) => Promise<string | null>;
}

export function OrderDrawer({ order, workers, onClose, onAdvance, onAssign, onRecheck }: DrawerProps) {
  const [stage, setStage] = useState<Stage>(order.stage);
  const [progress, setProgress] = useState(order.progress);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const totals = orderTotals(order);
  const apply = async (change: OrderAdvance) => {
    setIsBusy(true);
    const err = await onAdvance(change);
    setError(err);
    setIsBusy(false);
    if (!err) setNote("");
  };
  const openFile = async (key: string) => {
    const att = order.attachments?.find((a) => a.key === key);
    const url = att ? await getRepository().openAttachment(att) : null;
    if (url) window.open(url, "_blank", "noopener");
    else setError("That file isn't available in this browser.");
  };
  const trackUrl = typeof window !== "undefined" ? `${window.location.origin}/track?code=${order.trackingCode}` : "";
  const msg = `Hi ${order.client.name.split(" ")[0]}, update on your R1VLE project (${order.trackingCode}): ${stageLabel(order.stage)}, ${order.progress}% complete. Track it here: ${trackUrl}`;

  return (
    <aside className="drawer" aria-label={`Order ${order.invoiceNo}`}>
      <header>
        <span className={`stage-pill ${order.stage}`}>{stageLabel(order.stage)}</span>
        <button type="button" onClick={onClose} aria-label="Close order"><Close size={16} /></button>
      </header>
      <h2>{order.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.name}` : l.name)).join(" + ")}</h2>
      <p className="dim">{order.client.name}{order.client.company ? ` · ${order.client.company}` : ""} · <span className="mono">{order.trackingCode}</span> · {order.invoiceNo}</p>
      <div className="dr-kpis">
        <div><b>{formatUsd(totals.total)}</b><small>Contract</small></div>
        <div><b>{formatUsd(totals.deposit)}</b><small>{order.depositPct}% deposit</small></div>
        <div><b>{order.progress}%</b><small>Progress</small></div>
      </div>
      {order.brief && <p className="dr-brief">{order.brief}</p>}
      {(order.client.email || order.client.whatsapp) && <p className="dim">{order.client.email} · {order.client.whatsapp}</p>}
      <p className="dim">{order.region === "zw" ? "Zimbabwe prices" : "International prices"}{order.country ? ` · placed from ${order.country}` : ""}</p>
      {(order.attachments?.length ?? 0) > 0 && (
        <div className="dr-files">
          <small>Client files</small>
          {order.attachments?.map((a) => <button key={a.key} type="button" onClick={() => openFile(a.key)}>{a.name}<span>{formatBytes(a.size)}</span></button>)}
        </div>
      )}
      {(order.payments?.length ?? 0) > 0 && (
        <div className="dr-files">
          <small>Payments</small>
          {order.payments?.map((p) => (
            <div key={p.id} className={`dr-pay ${p.status}`}>
              <span>{p.kind === "deposit" ? "Deposit" : "Balance"} · {p.method === "usdc" ? `USDC ${p.channel.toUpperCase()}` : p.channel === "web" ? "Paynow" : p.channel} · {formatUsd(p.amountUsd)}</span>
              <span>{p.status}{p.proof ? ` · ${p.proof.slice(0, 14)}…` : ""}</span>
              {p.status === "pending" && onRecheck && <button type="button" className="dr-recheck" disabled={isBusy} onClick={() => onRecheck(p.id)}>Re-check</button>}
            </div>
          ))}
        </div>
      )}
      <div className="quick">
        {QUICK.map((q) => <button key={q.stage} type="button" disabled={isBusy} onClick={() => apply({ stage: q.stage, progress: Math.max(q.progress, order.progress), note: q.note })}>{q.label}</button>)}
      </div>
      <div className="dr-row">
        <label>Stage
          <select className="g-input" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
          </select>
        </label>
        <label>Assigned to
          <select className="g-input" value={order.assignedWorkerId ?? ""} onChange={async (e) => setError(await onAssign(e.target.value || null))}>
            <option value="">Unassigned</option>
            {workers.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.kind === "ai" ? "AI" : "Human"}</option>)}
          </select>
        </label>
      </div>
      <label className="dr-range">Progress · {progress}%
        <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
      </label>
      <textarea className="g-input" placeholder="Update note: the client sees this on their tracking page." maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p className="g-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-lime" style={{ justifyContent: "center" }} disabled={isBusy} onClick={() => apply({ stage, progress, note })}>{isBusy ? "Saving…" : "Post update"}</button>
      <div className="quick">
        {order.client.whatsapp && <a href={whatsappLink(order.client.whatsapp, msg)} target="_blank" rel="noopener noreferrer"><WhatsApp size={14} /> Message client</a>}
        <Link href={`/invoice/${order.trackingCode}`} target="_blank">Invoice</Link>
        <Link href={`/track?code=${order.trackingCode}`} target="_blank">Client view</Link>
      </div>
    </aside>
  );
}

export function ClientsList({ clients, orders, onOpen }: { clients: readonly ClientRow[]; orders: readonly Order[]; onOpen: (orderId: string) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (clients.length === 0) return <p className="g-empty">No clients yet.</p>;
  const byId = new Map(orders.map((o) => [o.id, o]));
  return (
    <>
      {clients.map((c) => {
        const isOpen = openKey === c.key;
        const history = c.orderIds.map((id) => byId.get(id)).filter((o): o is Order => !!o).reverse();
        return (
          <div key={c.key} className={`cl-item${isOpen ? " open" : ""}`}>
            <button type="button" className="g-row click" aria-expanded={isOpen} onClick={() => setOpenKey(isOpen ? null : c.key)}>
              <span className="g-av" aria-hidden="true">{c.name.trim().charAt(0).toUpperCase() || "?"}</span>
              <div className="g-grow"><b>{c.name}{c.orders > 1 && <span className="cl-badge">Returning · {c.orders}</span>}</b><small>{c.email} · {c.company || "Individual"}</small></div>
              <div className="g-row-end"><b>{formatUsd(c.lifetimeUsd)}</b><small>Last {new Date(c.lastOrderAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></div>
            </button>
            {isOpen && (
              <div className="cl-history">
                {history.map((o) => (
                  <button key={o.id} type="button" onClick={() => onOpen(o.id)}>
                    <span className={`stage-dot ${o.stage}`} />
                    <span className="g-grow">{o.invoiceNo} · {o.lines.map((l) => l.name).join(", ")}</span>
                    <span>{formatUsd(orderTotals(o).total)}</span>
                  </button>
                ))}
                <div className="quick">
                  {c.whatsapp && <a href={whatsappLink(c.whatsapp, `Hi ${c.name.split(" ")[0]}, it's R1VLE.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                  <a href={`mailto:${c.email}`}>Email</a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

const STATUS_COLOR: Record<Worker["status"], string> = { online: "#c8f53b", busy: "#ff9f3d", idle: "#9aa0a6", invited: "#8e9bff" };
const DEPT_OPTIONS: readonly { id: Worker["departmentId"]; name: string }[] = [...DEPARTMENTS.map((d) => ({ id: d.id, name: d.name })), { id: "hq", name: "Founder HQ" }];

export function TeamList({ workers, defaultDept, onHire }: { workers: readonly Worker[]; defaultDept: Worker["departmentId"]; onHire: (i: NewWorkerInput) => Promise<string | null> }) {
  const [form, setForm] = useState<NewWorkerInput>({ name: "", role: "", departmentId: defaultDept, email: "" });
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = await onHire(form);
    setError(err);
    if (!err) { setForm({ name: "", role: "", departmentId: defaultDept, email: "" }); setIsOpen(false); }
  };
  return (
    <>
      {workers.map((w) => (
        <div key={w.id} className="g-row">
          <span className="g-av">{w.kind === "ai" ? <Bot size={18} /> : <Users size={18} />}</span>
          <div className="g-grow"><b>{w.name}</b><small>{w.role}</small></div>
          <span className="g-status" style={{ "--c": STATUS_COLOR[w.status] } as React.CSSProperties}>{w.status}</span>
        </div>
      ))}
      {!isOpen ? (
        <button type="button" className="btn btn-lime" style={{ justifyContent: "center" }} onClick={() => setIsOpen(true)}>+ Employ someone</button>
      ) : (
        <form className="g-form" onSubmit={submit}>
          <b>New employee</b>
          <input className="g-input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required aria-label="Full name" />
          <input className="g-input" placeholder="Role, e.g. Motion designer" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required aria-label="Role" />
          <div className="dr-row">
            <select className="g-input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value as Worker["departmentId"] })} aria-label="Department">
              {DEPT_OPTIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input className="g-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
          </div>
          <small className="dim">Saved as &ldquo;invited&rdquo;. Their own room login comes in a later release.</small>
          {error && <p className="g-error" role="alert">{error}</p>}
          <div className="quick"><button type="submit">Save employee</button><button type="button" onClick={() => setIsOpen(false)}>Cancel</button></div>
        </form>
      )}
    </>
  );
}

export function PriceList({ services, onSave }: { services: readonly Service[]; onSave: (id: string, price: number) => Promise<string | null> }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  return (
    <>
      <p className="dim">Changes show on the public pricing page and apply to new orders.</p>
      {services.map((s) => (
        <div key={s.id} className="g-row">
          <div className="g-grow"><b>{s.name}</b><small>{{ from: "Starting at", monthly: "Per month", each: "Per piece", fixed: "Fixed" }[s.unit]} · ~{s.deliveryDays} days{status[s.id] ? ` · ${status[s.id]}` : ""}</small></div>
          <input className="g-input price" inputMode="decimal" aria-label={`Price for ${s.name}`} value={drafts[s.id] ?? String(s.priceUsd)} onChange={(e) => setDrafts({ ...drafts, [s.id]: e.target.value })} />
          <div className="quick"><button type="button" onClick={async () => { const err = await onSave(s.id, Number(drafts[s.id] ?? s.priceUsd)); setStatus({ ...status, [s.id]: err ?? "Saved" }); }}>Save</button></div>
        </div>
      ))}
    </>
  );
}
