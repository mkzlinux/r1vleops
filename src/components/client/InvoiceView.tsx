"use client";

import Link from "next/link";
import { COMPANY, PAYMENT_METHODS, PAYMENT_NOTE, departmentById } from "@/lib/catalog";
import { formatBytes } from "@/lib/files";
import { waLink } from "@/lib/config";
import { formatUsd, orderTotals, stageLabel } from "@/lib/orders";
import type { Order } from "@/lib/types";
import { isCloudflareBackend } from "@/lib/data";
import { USDC_CHAINS, payableKinds, type UsdcChain } from "@/lib/payments";
import { ArrowUpRight, Printer, WhatsApp } from "../Icons";
import { PayPanel } from "./PayPanel";

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

const CHANNEL_NAMES: Record<string, string> = { ecocash: "EcoCash", onemoney: "OneMoney", innbucks: "InnBucks", web: "Paynow" };
const paidVia = (channel: string): string => CHANNEL_NAMES[channel] ?? `USDC · ${USDC_CHAINS[channel as UsdcChain]?.label ?? channel}`;

interface InvoiceViewProps { order: Order; isNew: boolean; filesFailed?: boolean; onPaid?: () => void; resumePaymentId?: string | null }

export function InvoiceView({ order, isNew, filesFailed = false, onPaid = () => undefined, resumePaymentId = null }: InvoiceViewProps) {
  const totals = orderTotals(order);
  const dept = departmentById(order.departmentId);
  const isPaidUp = order.stage === "closed";
  const payMsg = `Hi R1VLE, please send deposit payment details for invoice ${order.invoiceNo} (code ${order.trackingCode}). Deposit: ${formatUsd(totals.deposit)}.`;
  const attachments = order.attachments ?? [];
  const received = (order.payments ?? []).filter((p) => p.status === "paid");
  const due = payableKinds(order)[0];
  const canPayOnline = isCloudflareBackend;
  const barNote = !due
    ? order.stage === "closed" ? "Paid in full. Thank you." : "Deposit received. Follow progress with your tracking code."
    : canPayOnline
      ? `Pay the ${due} below with Paynow or USDC.${due === "deposit" ? ` Work starts once your ${order.depositPct}% deposit is confirmed.` : ""}`
      : `Ask us for ${due} payment details on WhatsApp.${due === "deposit" ? ` Work starts once your ${order.depositPct}% deposit is confirmed.` : ""}`;

  return (
    <>
      <div className="wrap inv-bar no-print">
        <div>
          {isNew && <p style={{ margin: 0, fontWeight: 700 }}>Order placed. Save your tracking code: <span className="mono">{order.trackingCode}</span></p>}
          {filesFailed && <p className="error-box" role="alert" style={{ margin: "6px 0" }}>Your order is saved, but your files didn&apos;t upload. Please send them to us on WhatsApp.</p>}
          <p style={{ margin: 0, color: "var(--mute)", fontSize: 14 }}>{barNote}</p>
        </div>
        <div className="tools">
          <button type="button" className="btn btn-light btn-plain" onClick={() => window.print()}><Printer size={16} />&nbsp;Print / PDF</button>
          <a className="btn btn-wa" href={waLink(canPayOnline ? `Hi R1VLE, a question about invoice ${order.invoiceNo} (${order.trackingCode}).` : payMsg)} target="_blank" rel="noopener noreferrer"><WhatsApp size={18} /> {canPayOnline ? "Ask on WhatsApp" : "Get deposit details"}</a>
          <Link className="btn btn-dark" href={`/track?code=${order.trackingCode}`}><span>Track</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
        </div>
      </div>

      <div className="wrap"><PayPanel order={order} onPaid={onPaid} resumePaymentId={resumePaymentId} /></div>

      <article className="sheet" aria-label={`Invoice ${order.invoiceNo}`}>
        <div className="strip-top">
          <i /><span className="grow">R1VLE / {dept.name.toUpperCase()} DIVISION</span>
          <span className="date">INVOICE {fmtDate(order.createdAt)}</span>
        </div>
        <header className="head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="inv-logo" src="/brand/r1vle-logo-black.png" alt="R1VLE — Infrastructure behind the invisible" width={900} height={275} />
          <div className="title">
            <h1>{isPaidUp ? "RECEIPT" : "INVOICE"}</h1>
            <div className="meta">No. {order.invoiceNo}</div>
            <div className="meta">Currency / USD &nbsp;Symbol $</div>
            {order.region === "zw" && <div className="meta">Zimbabwe price list</div>}
          </div>
        </header>

        <section className="two">
          <div>
            <p className="label">01 / Bill to</p>
            <p className="name">{order.client.name}</p>
            <p className="sub">{[order.client.company, order.client.email, order.client.whatsapp].filter(Boolean).join("\n")}</p>
          </div>
          <div>
            <p className="label">02 / Issued by</p>
            <p className="name">{COMPANY.legalName.toUpperCase()}</p>
            <p className="sub">{`R1VLE ${dept.name} Division\n${COMPANY.email} / ${COMPANY.phoneDisplay}`}</p>
          </div>
        </section>

        <section>
          <p className="label">Project / {dept.name}</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.serviceId}><td><b>{l.name}</b></td><td className="r">{l.qty}</td><td className="r">{formatUsd(l.rateUsd)}</td><td className="r"><b>{formatUsd(l.qty * l.rateUsd)}</b></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sums"><div><span>Subtotal</span><b>{formatUsd(totals.total)}</b></div><div><span>Tax 0%</span><b>{formatUsd(0)}</b></div></div>
          <div className="total"><div className="k">{isPaidUp ? "Paid in full" : "Amount due"}</div><div className="v">{formatUsd(totals.total)}</div></div>
        </section>

        <section className="two">
          <div>
            <p className="label">03 / Payment terms</p>
            <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{order.depositPct}% on acceptance / {formatUsd(totals.deposit)}</p>
            <p style={{ margin: 0 }}>Balance on delivery / {formatUsd(totals.balance)}</p>
            <p className="sub" style={{ marginTop: 8 }}>Status: {stageLabel(order.stage)}</p>
          </div>
          <div>
            <p className="label">04 / Payment</p>
            <div className="pay-methods">
              {PAYMENT_METHODS.map((m) => <span key={m.id}>{m.label}{m.status !== "live" && <em>{m.status === "soon" ? "soon" : "on request"}</em>}</span>)}
            </div>
            <p className="sub" style={{ marginTop: 8 }}>{PAYMENT_NOTE} Use your invoice number as the payment reference.</p>
          </div>
        </section>

        {received.length > 0 && (
          <section>
            <p className="label">Payments received</p>
            <ul className="inv-files">{received.map((p) => <li key={p.id}>{p.kind === "deposit" ? "Deposit" : "Balance"} · {paidVia(p.channel)}{p.paidAt ? ` · ${fmtDate(p.paidAt)}` : ""}<span>{formatUsd(p.amountUsd)}</span></li>)}</ul>
          </section>
        )}

        {attachments.length > 0 && (
          <section>
            <p className="label">05 / Files received</p>
            <ul className="inv-files">{attachments.map((a) => <li key={a.key}>{a.name}<span>{formatBytes(a.size)}</span></li>)}</ul>
          </section>
        )}

        <section style={{ borderBottom: 0 }}>
          <p className="label">{attachments.length > 0 ? "06" : "05"} / Project tracking code</p>
          <div className="code-box">
            <span className="c">{order.trackingCode}</span>
            <small>Track progress any time at r1vle · /track</small>
          </div>
          {isPaidUp && <p style={{ marginTop: 18 }}><span className="stamp">Paid in full</span></p>}
        </section>

        <footer className="foot"><span className="l">R1VLE {dept.name} Division</span><span className="r">Infrastructure behind the invisible</span></footer>
      </article>
    </>
  );
}
