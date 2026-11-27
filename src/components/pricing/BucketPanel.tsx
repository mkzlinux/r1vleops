"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { COMPANY, PAYMENT_METHODS, maxQtyFor } from "@/lib/catalog";
import { formatUsd } from "@/lib/orders";
import { useBucket } from "../bucket/BucketProvider";
import { ArrowUpRight, BucketIcon, Close, Minus, Plus, Trash } from "../Icons";
import { NegotiateForm } from "./NegotiateForm";

function BucketContents({ onNavigate }: { onNavigate?: () => void }) {
  const { priced, region, setQty, remove, clear } = useBucket();
  const [isNegotiating, setIsNegotiating] = useState(false);
  if (priced.lines.length === 0) {
    return (
      <div className="bucket-empty">
        <div className="bucket-empty-art" aria-hidden="true"><BucketIcon size={34} /></div>
        <p><b>Your bucket is empty.</b><br />Tap <b>+ Add</b> on anything you need: a pentest, an app, ten flyers…</p>
      </div>
    );
  }
  return (
    <>
      <ul className="bucket-lines">
        {priced.lines.map((l) => { const { service, qty, amount } = l; return (
          <li key={service.id} className="bucket-line">
            <div className="bl-info">
              <b>{service.name}</b>
              <small>{formatUsd(l.unitUsd)}{service.unit === "each" ? (service.per ? ` per ${service.per}` : " each") : service.unit === "monthly" ? " / month" : ""}</small>
            </div>
            {maxQtyFor(service) > 1 ? (
              <div className="mini-stepper">
                <button type="button" onClick={() => setQty(service.id, qty - 1)} aria-label={`Fewer ${service.name}`}><Minus size={13} /></button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty(service.id, qty + 1)} disabled={qty >= maxQtyFor(service)} aria-label={`More ${service.name}`}><Plus size={13} /></button>
              </div>
            ) : (
              <button type="button" className="bl-remove" onClick={() => remove(service.id)} aria-label={`Remove ${service.name}`}><Trash size={14} /></button>
            )}
            <span className="bl-amount">{formatUsd(amount)}</span>
          </li>
        ); })}
      </ul>
      <button type="button" className="bucket-clear" onClick={clear}>Clear bucket</button>
      <div className="bucket-sums">
        <div><span>Deposit to start ({COMPANY.depositPct}%)</span><b>{formatUsd(priced.deposit)}</b></div>
        <div><span>Balance on delivery</span><b>{formatUsd(priced.balance)}</b></div>
      </div>
      <div className="bucket-total">
        <small>Total{region === "zw" ? " · Zimbabwe" : ""}</small>
        <strong>{formatUsd(priced.total)}</strong>
      </div>
      {isNegotiating ? <NegotiateForm onCancel={() => setIsNegotiating(false)} onNavigate={onNavigate} /> : (
        <button type="button" className="btn btn-outline-signal negotiate" onClick={() => setIsNegotiating(true)}>
          Negotiate this price
        </button>
      )}
      {!isNegotiating && <Link href="/order" className="btn btn-lime checkout" onClick={onNavigate}>
        <span>Checkout · get invoice</span><span className="arrow"><ArrowUpRight size={16} /></span>
      </Link>}
      <div className="pay-soon" aria-label="Payment methods">
        {PAYMENT_METHODS.filter((m) => m.status === "live").map((m) => <span key={m.id}>{m.label}</span>)}
        <em>pay online after checkout</em>
      </div>
    </>
  );
}

/** Desktop: sticky metal panel beside the catalogue. */
export function BucketPanel() {
  const { count, pulse } = useBucket();
  const icon = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = icon.current;
    if (!el || pulse === 0) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }, [pulse]);
  return (
    <aside className="bucket-panel" aria-label="Your bucket">
      <header>
        <span ref={icon} className="bp-icon" data-bucket-target><BucketIcon size={20} /></span>
        <div><b>Your bucket</b><small>{count} item{count === 1 ? "" : "s"}</small></div>
      </header>
      <BucketContents />
    </aside>
  );
}

/** Mobile: a bottom bar with count + total that opens a full bottom sheet. */
export function MobileBucket() {
  const { count, priced, pulse } = useBucket();
  const [isOpen, setIsOpen] = useState(false);
  const icon = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = icon.current;
    if (!el || pulse === 0) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }, [pulse]);
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [isOpen]);
  return (
    <>
      <button type="button" className={`mb-bar${count > 0 ? " has" : ""}`} onClick={() => setIsOpen(true)} aria-expanded={isOpen} aria-controls="bucket-sheet">
        <span ref={icon} className="mb-icon" data-bucket-target><BucketIcon size={20} />{count > 0 && <span className="badge-count">{count}</span>}</span>
        <span className="mb-text"><b>{count === 0 ? "Bucket is empty" : `${count} item${count === 1 ? "" : "s"}`}</b><small>{count === 0 ? "Add services below" : `Deposit ${formatUsd(priced.deposit)}`}</small></span>
        <span className="mb-total">{formatUsd(priced.total)}</span>
      </button>
      <div className={`bsheet-backdrop${isOpen ? " open" : ""}`} onClick={() => setIsOpen(false)} aria-hidden="true" />
      <div id="bucket-sheet" className={`bsheet${isOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Your bucket" aria-hidden={!isOpen}>
        <div className="bsheet-grip" aria-hidden="true" />
        <header>
          <b>Your bucket</b>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Close bucket"><Close size={18} /></button>
        </header>
        <div className="bsheet-body">{isOpen && <BucketContents onNavigate={() => setIsOpen(false)} />}</div>
      </div>
    </>
  );
}
