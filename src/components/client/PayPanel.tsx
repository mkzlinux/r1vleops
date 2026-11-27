"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { isCloudflareBackend } from "@/lib/data";
import { checkPayment, getPaymentOptions, startPayment, type PaymentOptions, type StartPaymentInput } from "@/lib/data/paymentsApi";
import { formatUsd } from "@/lib/orders";
import { PAYNOW_CHANNELS, USDC_CHAINS, amountDue, payableKinds, type Payment, type PaynowChannel, type UsdcChain } from "@/lib/payments";
import type { Order } from "@/lib/types";
import { ArrowUpRight, Check, Coin } from "../Icons";

const POLL_MS = { paynow: 5_000, usdc: 15_000 } as const;
const MAX_POLLS = 80;

type Tab = "paynow" | "usdc";

function CopyField({ label, value, isImportant = false }: { label: string; value: string; isImportant?: boolean }) {
  const [isCopied, setIsCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 1500); }).catch(() => undefined);
  };
  return (
    <div className={`pp-copy${isImportant ? " important" : ""}`}>
      <small>{label}</small>
      <div><code>{value}</code><button type="button" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`}>{isCopied ? "Copied" : "Copy"}</button></div>
    </div>
  );
}

/** Watches one payment until it settles (or we stop polling). */
function usePaymentWatch(code: string, payment: Payment | null, onPaid: () => void) {
  const [current, setCurrent] = useState<Payment | null>(payment);
  const polls = useRef(0);
  useEffect(() => { setCurrent(payment); polls.current = 0; }, [payment]);
  useEffect(() => {
    if (!current || current.status !== "pending") return;
    const timer = setTimeout(() => {
      polls.current += 1;
      if (polls.current > MAX_POLLS) return;
      checkPayment(code, current.id).then((p) => { setCurrent(p); if (p.status === "paid") onPaid(); }).catch(() => setCurrent({ ...current }));
    }, POLL_MS[current.method]);
    return () => clearTimeout(timer);
  }, [code, current, onPaid]);
  return current;
}

export function PayPanel({ order, onPaid, resumePaymentId }: { order: Order; onPaid: () => void; resumePaymentId: string | null }) {
  const kind = payableKinds(order)[0];
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [tab, setTab] = useState<Tab>("paynow");
  const [channel, setChannel] = useState<PaynowChannel>("ecocash");
  const [chain, setChain] = useState<UsdcChain>("base");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [started, setStarted] = useState<{ payment: Payment; instructions: string | null } | null>(null);
  const live = usePaymentWatch(order.trackingCode, started?.payment ?? null, onPaid);

  useEffect(() => {
    if (!isCloudflareBackend) return;
    getPaymentOptions().then((o) => { setOptions(o); if (!o.paynow && o.usdc.length) setTab("usdc"); if (o.usdc.length) setChain(o.usdc[0]); }).catch(() => setOptions({ paynow: false, usdc: [] }));
  }, []);

  // Returning from Paynow, or reopening the invoice: resume watching an open payment for what's due.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || started) return;
    const list = order.payments ?? [];
    const p = (resumePaymentId ? list.find((x) => x.id === resumePaymentId) : undefined)
      ?? [...list].reverse().find((x) => x.status === "pending" && x.kind === kind);
    if (p) { resumed.current = true; setStarted({ payment: p, instructions: null }); }
  }, [resumePaymentId, order.payments, started, kind]);

  if (live?.status === "paid") {
    return (
      <section className="pay-panel no-print done" aria-live="polite">
        <span className="pp-ok"><Check size={20} /></span>
        <div><h2>{live.kind === "deposit" ? "Deposit received" : "Paid in full"}</h2><p>Thank you. {live.kind === "deposit" ? "Work is starting; follow progress with your tracking code." : "Your receipt is below."}</p></div>
      </section>
    );
  }

  if (!isCloudflareBackend || !kind || !options || (!options.paynow && options.usdc.length === 0)) return null;
  const due = amountDue(order, kind);
  const needsPhone = PAYNOW_CHANNELS.find((c) => c.id === channel)?.needsPhone ?? false;

  const begin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsBusy(true);
    const input: StartPaymentInput = tab === "paynow" ? { kind, method: "paynow", channel, phone: needsPhone ? phone : undefined } : { kind, method: "usdc", channel: chain };
    try {
      const res = await startPayment(order.trackingCode, input);
      if (res.redirectUrl) { window.location.href = res.redirectUrl; return; }
      setStarted({ payment: res.payment, instructions: res.instructions });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't start the payment.");
    } finally {
      setIsBusy(false);
    }
  };

  const title = `${kind === "deposit" ? `Pay ${order.depositPct}% deposit` : "Pay balance"} · ${formatUsd(due)}`;

  if (live) {
    const isUsdc = live.method === "usdc";
    const c = isUsdc ? USDC_CHAINS[live.channel as UsdcChain] : null;
    return (
      <section className="pay-panel no-print" aria-live="polite">
        <header className="pp-head"><span className="pp-ico"><Coin size={18} /></span><h2>{title}</h2></header>
        {live.status === "pending" && !isUsdc && (
          <p className="pp-wait"><i />{started?.instructions || "Approve the payment request on your phone. This page updates by itself."}</p>
        )}
        {live.status === "pending" && isUsdc && c && (
          <>
            <p className="pp-warn">Send <b>USDC</b> on <b>{c.network}</b> only. Other tokens or networks can&apos;t be recovered.</p>
            <CopyField label={live.channel === "xrpl" ? "Amount (USDC)" : "Send exactly (USDC)"} value={live.payAmount ?? ""} isImportant />
            <CopyField label="To address" value={live.payTo ?? ""} />
            {live.destinationTag !== null && <CopyField label="Destination tag (required)" value={String(live.destinationTag)} isImportant />}
            {live.channel !== "xrpl" && <p className="pp-note">The extra decimals identify your invoice. Send that exact amount, after any withdrawal fee.</p>}
            <p className="pp-wait"><i />Watching the blockchain. Confirmation usually takes under a minute after you send.</p>
          </>
        )}
        {(live.status === "failed" || live.status === "expired") && (
          <div className="error-box" role="alert">This payment {live.status === "failed" ? "was cancelled or failed" : "expired"}. <button type="button" className="pp-link" onClick={() => setStarted(null)}>Try again</button></div>
        )}
        {live.status === "pending" && <button type="button" className="pp-link" onClick={() => setStarted(null)}>Use a different method</button>}
      </section>
    );
  }

  return (
    <form className="pay-panel no-print" onSubmit={begin}>
      <header className="pp-head"><span className="pp-ico"><Coin size={18} /></span><h2>{title}</h2></header>
      <div className="pp-tabs" role="tablist" aria-label="Payment method">
        {options.paynow && <button type="button" role="tab" aria-selected={tab === "paynow"} className={tab === "paynow" ? "on" : ""} onClick={() => setTab("paynow")}>Mobile money &amp; cards</button>}
        {options.usdc.length > 0 && <button type="button" role="tab" aria-selected={tab === "usdc"} className={tab === "usdc" ? "on" : ""} onClick={() => setTab("usdc")}>USDC</button>}
      </div>
      {tab === "paynow" ? (
        <>
          <div className="pp-chips" role="radiogroup" aria-label="Pay with">
            {PAYNOW_CHANNELS.map((c) => <button key={c.id} type="button" role="radio" aria-checked={channel === c.id} className={channel === c.id ? "on" : ""} onClick={() => setChannel(c.id)}>{c.label}</button>)}
          </div>
          {options.paynowTest && (
            <p className="pp-test"><b>Test mode</b> · no real money moves. Test numbers: 0771111111 succeeds, 0772222222 succeeds after a delay, 0773333333 is cancelled, 0774444444 has insufficient funds.</p>
          )}
          {needsPhone ? (
            <div className="field"><label htmlFor="pp-phone">Phone number to charge</label><input id="pp-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0771 234 567" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
          ) : <p className="pp-note">You&apos;ll continue on Paynow&apos;s secure page to pay by card or another option.</p>}
        </>
      ) : (
        <div className="pp-chips" role="radiogroup" aria-label="USDC network">
          {options.usdc.map((id) => <button key={id} type="button" role="radio" aria-checked={chain === id} className={chain === id ? "on" : ""} onClick={() => setChain(id)}>{USDC_CHAINS[id].label}</button>)}
        </div>
      )}
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="btn btn-lime" type="submit" disabled={isBusy}>
        <span>{isBusy ? "Starting…" : tab === "usdc" ? "Show payment details" : needsPhone ? "Send payment request" : "Continue to Paynow"}</span><span className="arrow"><ArrowUpRight size={16} /></span>
      </button>
    </form>
  );
}
