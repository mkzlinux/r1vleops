"use client";

import { useState } from "react";
import { getRepository } from "@/lib/data";
import { formatUsd, whatsappLink } from "@/lib/orders";
import { canCheckoutQuote, type Quote, type QuoteResponse } from "@/lib/quotes";
import { Close, WhatsApp } from "../Icons";
import { OpsFrame, OpsSky } from "./OpsFrame";
import { useOpsData } from "./useOpsData";

type Tab = "open" | "offers" | "won" | "declined";
const TAB_OF = (q: Quote): Tab =>
  q.status === "open" ? "open" : q.status === "converted" ? "won" : q.status === "declined" ? "declined" : "offers";
const pct = (q: Quote) => (q.listTotal > 0 ? Math.round((1 - q.proposedTotal / q.listTotal) * 100) : 0);
const isCustom = (q: Quote) => q.kind === "custom";
const fmt = (n: number) => formatUsd(n).replace(".00", "");

function quoteUrl(code: string): string {
  return typeof window === "undefined" ? `/quote/${code}` : `${window.location.origin}/quote/${code}`;
}

function DealDrawer({ quote, onClose, onRespond }: { quote: Quote; onClose: () => void; onRespond: (r: QuoteResponse) => Promise<string | null> }) {
  const midpoint = isCustom(quote) ? (quote.proposedTotal > 0 ? quote.proposedTotal : 0) : Math.round((quote.proposedTotal + quote.listTotal) / 2);
  const [amount, setAmount] = useState(quote.offerTotal !== null ? String(quote.offerTotal) : midpoint > 0 ? String(midpoint) : "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const canRespond = quote.status !== "converted";
  const first = quote.client.name.split(" ")[0];

  const act = async (r: QuoteResponse) => {
    setIsBusy(true);
    setError(await onRespond(r));
    setIsBusy(false);
  };

  const shareText = quote.status === "declined"
    ? `Hi ${first}, thanks for your offer on ticket ${quote.code}. ${quote.reply || "We can't do that price this time."} ${quoteUrl(quote.code)}`
    : `Hi ${first}, we've replied to your R1VLE ticket ${quote.code}${quote.offerTotal !== null ? `: ${fmt(quote.offerTotal)}` : ""}. Accept and get your invoice here: ${quoteUrl(quote.code)}`;

  return (
    <aside className="drawer" aria-label={`Ticket ${quote.code}`}>
      <header>
        <span className={`stage-pill deal-${quote.status}`}>{quote.status}</span>
        <button type="button" onClick={onClose} aria-label="Close"><Close size={16} /></button>
      </header>
      <h2>{quote.client.company || quote.client.name}</h2>
      <p className="dim">{quote.client.name} · <span className="mono">{quote.code}</span> · {new Date(quote.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
      {isCustom(quote) && <div className="dr-brief"><b>Custom: {quote.title}</b>{quote.timeline ? ` · ${quote.timeline}` : ""}</div>}
      <div className="dr-kpis">
        <div><b>{isCustom(quote) ? "Custom" : fmt(quote.listTotal)}</b><small>{isCustom(quote) ? "Not listed" : "List"}</small></div>
        <div><b>{quote.proposedTotal > 0 ? fmt(quote.proposedTotal) : "Open"}</b><small>Their budget{isCustom(quote) ? "" : ` · −${pct(quote)}%`}</small></div>
        <div><b>{quote.offerTotal !== null ? fmt(quote.offerTotal) : "—"}</b><small>Offer</small></div>
      </div>
      {!isCustom(quote) && <div className="dr-files">
        <small>Bucket</small>
        {quote.lines.map((l) => <div key={l.serviceId} className="dr-pay"><span>{l.qty > 1 ? `${l.qty} × ` : ""}{l.name}</span><span>{formatUsd(l.qty * l.rateUsd)}</span></div>)}
      </div>}
      {quote.note && <p className="dr-brief">{quote.note}</p>}
      <p className="dim">{quote.client.email} · {quote.client.whatsapp} · {quote.region === "zw" ? "Zimbabwe prices" : "International prices"}</p>

      {canRespond && (
        <div className="g-form">
          <label className="dr-range">{isCustom(quote) ? "Your price (USD)" : "Counter-offer (USD)"}
            <input className="g-input" type="number" inputMode="decimal" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <textarea className="g-input" placeholder="Message to the client (shown on their ticket)" value={message} onChange={(e) => setMessage(e.target.value)} />
          {error && <p className="g-error" role="alert">{error}</p>}
          <div className="quick">
            {quote.proposedTotal > 0 && <button type="button" disabled={isBusy} onClick={() => act({ action: "accept", message })}>Accept {fmt(quote.proposedTotal)}</button>}
            <button type="button" disabled={isBusy || !amount} onClick={() => act({ action: "counter", amount: Number(amount), message })}>{isCustom(quote) ? "Send price" : "Counter"} {amount ? fmt(Number(amount)) : ""}</button>
            <button type="button" disabled={isBusy} onClick={() => act({ action: "decline", message })}>Decline</button>
          </div>
        </div>
      )}
      {quote.reply && <p className="dr-brief"><b>Your reply:</b> {quote.reply}</p>}
      {quote.status !== "open" && (
        <div className="quick">
          {quote.client.whatsapp && <a href={whatsappLink(quote.client.whatsapp, shareText)} target="_blank" rel="noopener noreferrer"><WhatsApp size={14} /> Send to client</a>}
          <a href={`mailto:${quote.client.email}?subject=${encodeURIComponent(`Your R1VLE ticket ${quote.code}`)}&body=${encodeURIComponent(shareText)}`}>Email</a>
          <a href={`/quote/${quote.code}`} target="_blank" rel="noopener noreferrer">Client view</a>
          {quote.orderCode && <a href={`/invoice/${quote.orderCode}`} target="_blank" rel="noopener noreferrer">Invoice</a>}
        </div>
      )}
      {quote.status === "open" && <p className="dim">After you respond, send the client their link on WhatsApp or email from here.</p>}
    </aside>
  );
}

export function DealsView() {
  const { quotes, orders, error, run } = useOpsData();
  const [tab, setTab] = useState<Tab>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const now = new Date();
  const open = quotes.filter((q) => q.status === "open");
  const won = quotes.filter((q) => q.status === "converted");
  const decided = quotes.filter((q) => q.status !== "open");
  const winRate = decided.length ? Math.round((won.length / decided.length) * 100) : 0;
  const wonValue = won.reduce((n, q) => n + (q.offerTotal ?? 0), 0);
  const list = quotes.filter((q) => TAB_OF(q) === tab);
  const current = quotes.find((q) => q.id === openId) ?? null;
  const tabs: readonly { id: Tab; label: string }[] = [
    { id: "open", label: `Open ${open.length}` },
    { id: "offers", label: `Offers out ${quotes.filter((q) => TAB_OF(q) === "offers").length}` },
    { id: "won", label: `Won ${won.length}` },
    { id: "declined", label: "Declined" },
  ];

  return (
    <OpsFrame active="deals" alerts={orders.filter((o) => o.stage === "awaiting_deposit").length + open.length}>
      <div className={`room-grid${current ? " with-drawer" : ""}`}>
        <section className="room-main">
          <OpsSky accent="#c8f53b" strikeTarget={{ x: 0.82, y: 0.35 }} className="room-hero">
            <span className="ops-chip"><i />Negotiations</span>
            <h1>{open.length > 0 ? `${open.length} ticket${open.length === 1 ? "" : "s"} waiting` : "No open tickets"}</h1>
            <p>{error ?? "Clients propose a budget from their bucket. Accept, counter or decline; an agreed price becomes their invoice in one tap."}</p>
            <div className="room-kpis">
              <div><b>{open.length}</b><small>Open</small></div>
              <div><b>{fmt(wonValue)}</b><small>Won value</small></div>
              <div><b>{winRate}%</b><small>Win rate</small></div>
              <div><b>{quotes.length}</b><small>All tickets</small></div>
            </div>
          </OpsSky>
          <div className="room-panel">
            <div className="g-tabs" role="tablist">
              {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="g-list" role="tabpanel">
              {list.length === 0 ? <p className="g-empty">{tab === "open" ? "No tickets waiting. They appear when a client taps “Negotiate” in their bucket." : "Nothing here yet."}</p> : list.map((q) => {
                const expired = (q.status === "accepted" || q.status === "countered") && !canCheckoutQuote(q, now);
                return (
                  <button key={q.id} type="button" className={`g-row click${q.id === openId ? " on" : ""}`} onClick={() => setOpenId(q.id)}>
                    <span className={`stage-dot ${q.status === "open" ? "awaiting_deposit" : q.status === "converted" ? "in_progress" : "in_review"}`} />
                    <div className="g-grow"><b>{q.client.company || q.client.name}{isCustom(q) && <span className="cl-badge">Custom</span>}</b><small>{isCustom(q) ? q.title : q.lines.map((l) => l.name).join(", ")}{expired ? " · offer expired" : ""}</small></div>
                    <div className="g-row-end">{isCustom(q) ? <><b>{q.proposedTotal > 0 ? fmt(q.proposedTotal) : "Open budget"}</b><small>{q.timeline || "No timeline"}</small></> : <><b>{fmt(q.proposedTotal)} <small style={{ display: "inline" }}>of {fmt(q.listTotal)}</small></b><small>−{pct(q)}%</small></>}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        {current && (
          <DealDrawer key={`${current.id}-${current.status}-${current.respondedAt}`} quote={current} onClose={() => setOpenId(null)}
            onRespond={(r) => run(() => getRepository().respondToQuote(current.id, r))} />
        )}
      </div>
    </OpsFrame>
  );
}
