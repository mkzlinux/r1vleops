"use client";

import Link from "next/link";
import { COMPANY, departmentById } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import { formatUsd, orderTotals, stageLabel } from "@/lib/orders";
import type { Order } from "@/lib/types";
import { ArrowUpRight, Printer, WhatsApp } from "../Icons";

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

export function InvoiceView({ order, isNew }: { order: Order; isNew: boolean }) {
  const totals = orderTotals(order);
  const dept = departmentById(order.departmentId);
  const isPaidUp = order.stage === "closed";
  const proofMsg = `Hi R1VLE, here is my proof of payment for invoice ${order.invoiceNo} (code ${order.trackingCode}). Deposit: ${formatUsd(totals.deposit)}.`;

  return (
    <>
      <div className="wrap inv-bar no-print">
        <div>
          {isNew && <p style={{ margin: 0, fontWeight: 700 }}>Order placed. Save your tracking code: <span className="mono">{order.trackingCode}</span></p>}
          <p style={{ margin: 0, color: "var(--mute)", fontSize: 14 }}>Pay the deposit, then send proof on WhatsApp. Work starts once it&rsquo;s confirmed.</p>
        </div>
        <div className="tools">
          <button type="button" className="btn btn-light btn-plain" onClick={() => window.print()}><Printer size={16} />&nbsp;Print / PDF</button>
          <a className="btn btn-wa" href={waLink(proofMsg)} target="_blank" rel="noopener noreferrer"><WhatsApp size={18} /> Send proof of payment</a>
          <Link className="btn btn-dark" href={`/track?code=${order.trackingCode}`}><span>Track</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
        </div>
      </div>

      <article className="sheet" aria-label={`Invoice ${order.invoiceNo}`}>
        <div className="strip-top">
          <i /><span className="grow">R1VLE / {dept.name.toUpperCase()} DIVISION</span>
          <span className="date">INVOICE {fmtDate(order.createdAt)}</span>
        </div>
        <header className="head">
          <div className="logo">R1VLE<small>INFRASTRUCTURE BEHIND THE INVISIBLE</small></div>
          <div className="title">
            <h1>{isPaidUp ? "RECEIPT" : "INVOICE"}</h1>
            <div className="meta">No. {order.invoiceNo}</div>
            <div className="meta">Currency / USD &nbsp;Symbol $</div>
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
            <p className="label">04 / Payment options</p>
            {COMPANY.paymentOptions.map((p) => <div key={p.label}><p className="name" style={{ fontSize: 13 }}>{p.label}</p><p className="sub">{p.detail}</p></div>)}
            <p className="sub" style={{ marginTop: 8 }}>Use your invoice number as the payment reference.</p>
          </div>
        </section>

        <section style={{ borderBottom: 0 }}>
          <p className="label">05 / Project tracking code</p>
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
