"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPANY, DEPARTMENTS, SERVICES, servicesFor } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { formatUsd } from "@/lib/orders";
import type { DepartmentId, Service } from "@/lib/types";
import { ArrowUpRight, Check, WhatsApp } from "../Icons";

const UNIT_SUFFIX: Record<Service["unit"], string> = { fixed: "", from: "+", monthly: "/mo" };

export function Pricing() {
  const [active, setActive] = useState<DepartmentId>("intelligence");
  const [services, setServices] = useState<readonly Service[]>(SERVICES);

  useEffect(() => {
    let cancelled = false;
    getRepository().listServices()
      .then((list) => { if (!cancelled && list.length > 0) setServices(list); })
      .catch(() => { /* keep the built-in price list if live prices fail to load */ });
    return () => { cancelled = true; };
  }, []);

  const list = servicesFor(active, services);

  return (
    <section className="section" id="pricing" aria-labelledby="pricing-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Pricing · USD</span>
            <h2 id="pricing-title">Clear prices. Room to talk.</h2>
          </div>
          <div className="tabs" role="tablist" aria-label="Department">
            {DEPARTMENTS.map((d) => (
              <button key={d.id} role="tab" aria-selected={active === d.id} onClick={() => setActive(d.id)} type="button">
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <div className="prices" role="tabpanel">
          {list.map((s, i) => (
            <article key={s.id} className={`price${i === 1 ? " featured" : ""}`}>
              <div>
                <div className="from">{s.unit === "from" ? "Starting at" : s.unit === "monthly" ? "Retainer" : "Fixed price"}</div>
                <h3>{s.name}</h3>
                <p className="muted">{s.summary}</p>
              </div>
              <div className="amount">{formatUsd(s.priceUsd).replace(".00", "")}{UNIT_SUFFIX[s.unit]}<small>~{s.deliveryDays} days</small></div>
              <ul>{s.includes.map((x) => <li key={x}><Check size={15} />{x}</li>)}</ul>
              <div className="actions">
                <Link href={`/order?service=${s.id}`} className={`btn ${i === 1 ? "btn-lime" : "btn-dark"}`}>
                  <span>Order</span><span className="arrow"><ArrowUpRight size={16} /></span>
                </Link>
                <a className="btn btn-wa" href={waLink(`Hi R1VLE, I'd like to negotiate "${s.name}" (listed at ${formatUsd(s.priceUsd)}${UNIT_SUFFIX[s.unit]}).`)} target="_blank" rel="noopener noreferrer" aria-label={`Negotiate ${s.name} on WhatsApp`}>
                  <WhatsApp size={18} /> Negotiate
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="deposit-note">
          <span><b>{COMPANY.depositPct}% deposit</b> starts work</span>
          <span><b>Balance</b> on delivery</span>
          <span><b>Pay via</b> {COMPANY.paymentOptions.map((p) => p.detail).join(" · ")}</span>
          <span><b>Custom scope?</b> Every price is negotiable on WhatsApp.</span>
        </div>
      </div>
    </section>
  );
}
