"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { COMPANY, DEPARTMENTS, SERVICES, servicesFor } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { formatUsd, validateNewOrder } from "@/lib/orders";
import type { Client, Service } from "@/lib/types";
import { ArrowUpRight, Check, WhatsApp } from "../Icons";

const EMPTY_CLIENT: Client = { name: "", company: "", email: "", whatsapp: "" };

export function OrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const preselect = params.get("service");
  const [services, setServices] = useState<readonly Service[]>(SERVICES);
  const [picked, setPicked] = useState<string[]>(() => (preselect && SERVICES.some((s) => s.id === preselect) ? [preselect] : []));
  const [client, setClient] = useState<Client>(EMPTY_CLIENT);
  const [brief, setBrief] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRepository().listServices().then((list) => { if (!cancelled && list.length) setServices(list); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const set = (k: keyof Client) => (v: string) => setClient((c) => ({ ...c, [k]: v }));

  const selected = services.filter((s) => picked.includes(s.id));
  const total = selected.reduce((sum, s) => sum + s.priceUsd, 0);
  const deposit = Math.round(total * COMPANY.depositPct) / 100;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // bots fill hidden fields
    const input = { client, brief, serviceIds: picked };
    const problems = validateNewOrder(input);
    setErrors(problems);
    if (problems.length > 0) return;
    setIsSubmitting(true);
    try {
      const order = await getRepository().createOrder(input);
      router.push(`/invoice/${order.trackingCode}?new=1`);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Something went wrong. Please try again or message us on WhatsApp."]);
      setIsSubmitting(false);
    }
  };

  const negotiateMsg = `Hi R1VLE, I'd like to discuss: ${selected.map((s) => s.name).join(", ") || "a custom project"}.`;

  return (
    <form className="order-grid" onSubmit={submit} noValidate>
      <div>
        <div className="panel">
          <h2>1 · Choose services</h2>
          <p className="hint">Pick one or more. Need something else? Order the closest match and describe it in the brief.</p>
          {DEPARTMENTS.map((d) => (
            <div className="svc-group" key={d.id}>
              <h3>{d.name}</h3>
              <div className="svc-list">
                {servicesFor(d.id, services).map((s) => (
                  <button type="button" key={s.id} className="svc" aria-pressed={picked.includes(s.id)} onClick={() => toggle(s.id)}>
                    <span className="tick" aria-hidden="true">{picked.includes(s.id) && <Check size={12} />}</span>
                    <span className="nm">{s.name}</span>
                    <span className="pr">{s.unit === "from" ? "from " : ""}{formatUsd(s.priceUsd)}{s.unit === "monthly" ? " / month" : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>2 · Your details</h2>
          <p className="hint">We send updates on WhatsApp. Your invoice and tracking code appear right after you submit.</p>
          <div className="form-grid">
            <div className="field"><label htmlFor="o-name">Full name *</label><input id="o-name" className="input" value={client.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" required /></div>
            <div className="field"><label htmlFor="o-co">Company</label><input id="o-co" className="input" value={client.company} onChange={(e) => set("company")(e.target.value)} autoComplete="organization" /></div>
            <div className="field"><label htmlFor="o-email">Email *</label><input id="o-email" type="email" className="input" value={client.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" required /></div>
            <div className="field"><label htmlFor="o-wa">WhatsApp number *</label><input id="o-wa" type="tel" className="input" placeholder="+263 77 123 4567" value={client.whatsapp} onChange={(e) => set("whatsapp")(e.target.value)} autoComplete="tel" required /></div>
            <div className="field full"><label htmlFor="o-brief">Project brief</label><textarea id="o-brief" className="input" maxLength={4000} placeholder="Goals, deadline, links, anything we should know." value={brief} onChange={(e) => setBrief(e.target.value)} /></div>
            <div className="sr-only" aria-hidden="true"><label htmlFor="o-hp">Leave empty</label><input id="o-hp" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></div>
          </div>
        </div>
      </div>

      <aside className="summary" aria-live="polite">
        <span className="eyebrow" style={{ color: "#8f8f8c" }}>Order summary</span>
        {selected.length === 0 ? <p style={{ margin: 0, color: "#bdbdba" }}>No services selected yet.</p> : selected.map((s) => (
          <div className="row" key={s.id}><span>{s.name}</span><b>{formatUsd(s.priceUsd)}</b></div>
        ))}
        <div><small>Contract total</small><div className="big">{formatUsd(total)}</div></div>
        <div className="dep"><small>Due now to start · {COMPANY.depositPct}% deposit</small><div className="big">{formatUsd(deposit)}</div><small>Balance {formatUsd(total - deposit)} on delivery</small></div>
        {errors.length > 0 && <div className="error-box" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
        <button className="btn btn-lime" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? "Generating invoice…" : "Place order & get invoice"}</span><span className="arrow"><ArrowUpRight size={16} /></span>
        </button>
        <a className="btn btn-wa" href={waLink(negotiateMsg)} target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
          <WhatsApp size={18} /> Negotiate on WhatsApp first
        </a>
      </aside>
    </form>
  );
}
