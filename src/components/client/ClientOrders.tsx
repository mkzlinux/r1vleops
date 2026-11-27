"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { departmentById } from "@/lib/catalog";
import { forgetClient, readClientMemory, rememberClient } from "@/lib/clientMemory";
import { getRepository } from "@/lib/data";
import { formatUsd, orderTotals, stageLabel } from "@/lib/orders";
import { amountDue, payableKinds } from "@/lib/payments";
import type { Order } from "@/lib/types";
import { ArrowUpRight } from "../Icons";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function OrderCard({ order }: { order: Order }) {
  const t = orderTotals(order);
  const due = payableKinds(order)[0];
  const items = order.lines.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ""}${l.name}`).join(", ");
  return (
    <article className="co-card">
      <header>
        <div><span className="co-dept">{departmentById(order.departmentId).name}</span><b>{order.invoiceNo}</b><small>{fmtDate(order.createdAt)} · <span className="mono">{order.trackingCode}</span></small></div>
        <span className={`co-stage ${order.stage}`}>{stageLabel(order.stage)}</span>
      </header>
      <p className="co-items">{items}</p>
      <div className="co-bar" aria-label={`Progress ${order.progress}%`}><i style={{ width: `${order.progress}%` }} /></div>
      <footer>
        <div><b>{formatUsd(t.total)}</b><small>{order.stage === "closed" ? "Paid in full" : `Deposit ${formatUsd(t.deposit)}`}</small></div>
        <div className="co-actions">
          {due && <Link className="btn btn-lime btn-plain" href={`/invoice/${order.trackingCode}`}>Pay {due} · {formatUsd(amountDue(order, due))}</Link>}
          <Link className="btn btn-light btn-plain" href={`/invoice/${order.trackingCode}`}>{order.stage === "closed" ? "Receipt" : "Invoice"}</Link>
          <Link className="btn btn-dark btn-plain" href={`/track?code=${order.trackingCode}`}>Track</Link>
        </div>
      </footer>
    </article>
  );
}

/** Guest-checkout style history: email + any one tracking code shows every order under that email. */
export function ClientOrders() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isRemembered, setIsRemembered] = useState(false);

  const lookup = async (e: string, c: string) => {
    setIsBusy(true);
    setError(null);
    try {
      const found = await getRepository().findClientOrders(e.trim(), c.trim());
      if (found.length === 0) { setOrders(null); setError("We couldn't match that email and tracking code. Use the email you ordered with and a code from any of your invoices."); return; }
      setOrders(found);
      rememberClient(found[0].client.email ? found[0].client : { name: "", company: "", email: e.trim(), whatsapp: "" }, c);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lookup failed. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  // Returning on the same device: fill in and look up automatically.
  useEffect(() => {
    const mem = readClientMemory();
    if (mem.client?.email && mem.codes[0]) {
      setEmail(mem.client.email);
      setCode(mem.codes[0]);
      setIsRemembered(true);
      void lookup(mem.client.email, mem.codes[0]);
    }
  }, []);

  const submit = (e: FormEvent) => { e.preventDefault(); void lookup(email, code); };
  const signOut = () => { forgetClient(); setOrders(null); setEmail(""); setCode(""); setIsRemembered(false); };
  const name = orders?.[0]?.client.name.split(" ")[0];
  const spent = (orders ?? []).reduce((n, o) => n + orderTotals(o).total, 0);

  if (orders) {
    return (
      <section aria-live="polite">
        <div className="co-head">
          <div>
            <h2>Welcome back{name ? `, ${name}` : ""}.</h2>
            <p className="dim">{orders.length} order{orders.length === 1 ? "" : "s"} under {orders[0].client.email} · {formatUsd(spent)} total</p>
          </div>
          <div className="co-actions">
            <Link href="/pricing" className="btn btn-dark"><span>New order</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
            <button type="button" className="btn btn-light btn-plain" onClick={signOut}>{isRemembered ? "Not you? Forget this device" : "Done"}</button>
          </div>
        </div>
        <div className="co-list">{orders.map((o) => <OrderCard key={o.id} order={o} />)}</div>
      </section>
    );
  }

  return (
    <form className="panel co-form" onSubmit={submit}>
      <h2>Find your orders</h2>
      <p className="hint">No account needed. Use the email you ordered with and the tracking code from any one of your invoices.</p>
      <div className="form-grid">
        <div className="field"><label htmlFor="co-email">Email</label><input id="co-email" className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label htmlFor="co-code">Any tracking code</label><input id="co-code" className="input mono" placeholder="R1V-XXXX-XXXX" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
      </div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="btn btn-dark" type="submit" disabled={isBusy}><span>{isBusy ? "Looking up…" : "Show my orders"}</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
    </form>
  );
}
