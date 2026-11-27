"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { waLink } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { formatUsd } from "@/lib/orders";
import { canCheckoutQuote, type Quote } from "@/lib/quotes";
import { ArrowUpRight, WhatsApp } from "../Icons";

const REFRESH_MS = 30_000;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const HEADLINES: Record<Quote["status"], string> = {
  open: "We're reviewing your offer.",
  countered: "We've made you an offer.",
  accepted: "Your price is approved.",
  declined: "We couldn't do that price.",
  converted: "Deal done. Invoice created.",
};

export function QuoteView({ code, isNew }: { code: string; isNew: boolean }) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(() => {
    getRepository().findQuote(code).then(setQuote).catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load the ticket."));
  }, [code]);

  useEffect(() => { load(); }, [load]);
  // While we're still deciding, refresh quietly so the reply appears without a reload.
  useEffect(() => {
    if (quote?.status !== "open") return;
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [quote?.status, load]);

  if (quote === undefined) return <p className="empty">{error ?? "Loading ticket…"}</p>;
  if (quote === null) return <p className="empty">No negotiation ticket matches <span className="mono">{code}</span>.</p>;

  const now = new Date();
  const isLive = canCheckoutQuote(quote, now);
  const isExpired = (quote.status === "accepted" || quote.status === "countered") && !isLive;

  const checkout = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const order = await getRepository().checkoutQuote(quote.code);
      router.push(`/invoice/${order.trackingCode}?new=1`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't create the invoice.");
      setIsBusy(false);
    }
  };

  return (
    <div className="qv">
      {isNew && <p className="qv-new" role="status">Ticket opened. Save this page: <span className="mono">{quote.code}</span></p>}
      <span className={`qv-status ${isExpired ? "expired" : quote.status}`}>{isExpired ? "Offer expired" : quote.status === "open" ? "Under review" : quote.status}</span>
      <h1 className="page-title qv-title">{isExpired ? "This offer has expired." : HEADLINES[quote.status]}</h1>

      <div className="qv-grid">
        <section className="panel qv-deal" aria-label="Offer">
          <div className="qv-prices">
            <div><small>List price</small><b className={quote.offerTotal !== null ? "struck" : ""}>{formatUsd(quote.listTotal)}</b></div>
            <div><small>Your budget</small><b>{formatUsd(quote.proposedTotal)}</b></div>
            {quote.offerTotal !== null && <div className="offer"><small>{quote.status === "countered" ? "Our offer" : "Agreed price"}</small><b>{formatUsd(quote.offerTotal)}</b></div>}
          </div>
          {quote.reply && <blockquote className="qv-reply">{quote.reply}<cite>R1VLE{quote.respondedAt ? ` · ${fmtDate(quote.respondedAt)}` : ""}</cite></blockquote>}
          {quote.status === "open" && <p className="hint">We usually reply within a day, here and on WhatsApp. This page updates by itself.</p>}
          {isLive && quote.validUntil && <p className="hint">Valid until {fmtDate(quote.validUntil)}. Accepting creates your invoice at this price; work starts after the {formatUsd(quote.offerTotal! / 2)} deposit.</p>}
          {error && <div className="error-box" role="alert">{error}</div>}
          <div className="qv-actions">
            {isLive && <button type="button" className="btn btn-lime" onClick={checkout} disabled={isBusy}><span>{isBusy ? "Creating invoice…" : `Accept ${formatUsd(quote.offerTotal!)} & get invoice`}</span><span className="arrow"><ArrowUpRight size={16} /></span></button>}
            {quote.status === "converted" && quote.orderCode && <Link className="btn btn-dark" href={`/invoice/${quote.orderCode}`}><span>View invoice</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>}
            {(quote.status === "declined" || isExpired) && <Link className="btn btn-dark" href="/pricing"><span>Back to pricing</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>}
            <a className="btn btn-wa" href={waLink(`Hi R1VLE, about my negotiation ticket ${quote.code}.`)} target="_blank" rel="noopener noreferrer"><WhatsApp size={18} /> Chat about it</a>
          </div>
        </section>

        <aside className="panel qv-items" aria-label="Bucket">
          <p className="label">Ticket <span className="mono">{quote.code}</span> · {fmtDate(quote.createdAt)}</p>
          <ul>{quote.lines.map((l) => <li key={l.serviceId}><span>{l.qty > 1 ? `${l.qty} × ` : ""}{l.name}</span><b>{formatUsd(l.qty * l.rateUsd)}</b></li>)}</ul>
          {quote.note && <p className="qv-note">&ldquo;{quote.note}&rdquo;</p>}
        </aside>
      </div>
    </div>
  );
}
