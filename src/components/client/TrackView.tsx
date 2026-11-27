"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, useEffect } from "react";
import { departmentById } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import { isCloudflareBackend } from "@/lib/data";
import { amountDue, payableKinds } from "@/lib/payments";
import { formatUsd, normalizeTrackingCode, orderTotals, stageLabel } from "@/lib/orders";
import { STAGES, type Order } from "@/lib/types";
import { ArrowUpRight, WhatsApp } from "../Icons";
import { useOrderByCode } from "./useOrderByCode";
import { rememberCode } from "@/lib/clientMemory";

export function ProgressRing({ value, size = 170, color = "var(--red)", track = "var(--rule)", label = "complete" }: { value: number; size?: number; color?: string; track?: string; label?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="progress-ring" style={{ width: size, height: size }} role="img" aria-label={`${value}% ${label}`}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="val"><div><b>{value}%</b><small>{label}</small></div></div>
    </div>
  );
}

function OrderStatus({ order }: { order: Order }) {
  const idx = STAGES.indexOf(order.stage);
  const totals = orderTotals(order);
  const updates = [...order.updates].reverse();
  return (
    <>
      <div className="track-hero">
        <div>
          <span className="eyebrow">{departmentById(order.departmentId).name} · {order.invoiceNo}</span>
          <h2>{order.lines.map((l) => l.name).join(" + ")}</h2>
          <div className="meta">For {order.client.name}{order.client.company ? ` · ${order.client.company}` : ""} · Code <span className="mono">{order.trackingCode}</span></div>
          <ol className="stepper" aria-label="Project stages">
            {STAGES.map((s, i) => <li key={s} className={i < idx ? "done" : i === idx ? "now" : ""} aria-current={i === idx ? "step" : undefined}>{stageLabel(s)}</li>)}
          </ol>
        </div>
        <ProgressRing value={order.progress} />
      </div>
      <div className="track-cols">
        <div className="panel">
          <h2>Updates</h2>
          <ol className="timeline">
            {updates.map((u) => (
              <li key={u.at + u.note}>
                <time dateTime={u.at}>{new Date(u.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time>
                <div><b>{stageLabel(u.stage)} · {u.progress}%</b>{u.note}</div>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel">
          <h2>Billing</h2>
          <div className="sums" style={{ display: "grid", gap: 8, margin: "14px 0 20px", fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contract total</span><b>{formatUsd(totals.total)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Deposit ({order.depositPct}%)</span><b>{formatUsd(totals.deposit)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Balance on delivery</span><b>{formatUsd(totals.balance)}</b></div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {payableKinds(order).length > 0 && isCloudflareBackend && (
              <Link className="btn btn-lime" href={`/invoice/${order.trackingCode}`} style={{ justifyContent: "space-between" }}><span>{payableKinds(order)[0] === "deposit" ? "Pay deposit" : "Pay balance"} · {formatUsd(amountDue(order, payableKinds(order)[0]))}</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
            )}
            <Link className="btn btn-dark" href={`/invoice/${order.trackingCode}`} style={{ justifyContent: "space-between" }}><span>View invoice</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
            <a className="btn btn-wa" style={{ justifyContent: "center" }} href={waLink(`Hi R1VLE, a question about my project ${order.trackingCode}.`)} target="_blank" rel="noopener noreferrer"><WhatsApp size={18} /> Ask about this project</a>
          </div>
        </div>
      </div>
    </>
  );
}

export function TrackView({ initialCode }: { initialCode: string | null }) {
  const router = useRouter();
  const [input, setInput] = useState(initialCode ?? "");
  const state = useOrderByCode(initialCode);
  const foundCode = state.status === "found" ? state.order.trackingCode : null;
  useEffect(() => { if (foundCode) rememberCode(foundCode); }, [foundCode]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = normalizeTrackingCode(input);
    if (clean) router.replace(`/track?code=${encodeURIComponent(clean)}`);
  };

  return (
    <div className="track-wrap">
      <form className="track-form" onSubmit={submit} style={{ maxWidth: 560, marginBottom: 28 }}>
        <label htmlFor="t-code" className="sr-only">Tracking code</label>
        <input id="t-code" placeholder="R1V-XXXX-XXXX" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" spellCheck={false} />
        <button className="btn btn-dark" type="submit"><span>Track</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
      </form>
      {state.status === "loading" && <p className="empty">Looking up your project…</p>}
      {state.status === "missing" && <p className="empty">No project matches that code. Check it against your invoice, or message us on WhatsApp.</p>}
      {state.status === "error" && <p className="error-box" role="alert">{state.message}</p>}
      {state.status === "found" && <OrderStatus order={state.order} />}
    </div>
  );
}
