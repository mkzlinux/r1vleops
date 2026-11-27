"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEPARTMENTS, maxQtyFor } from "@/lib/catalog";
import { formatUsd } from "@/lib/orders";
import { REGIONS, priceNote, unitPrice } from "@/lib/pricing";
import type { DepartmentId, Region, Service } from "@/lib/types";
import { useBucket } from "../bucket/BucketProvider";
import { Check, Chip, Clock, Film, Minus, Plus, Shield } from "../Icons";
import { BucketPanel, MobileBucket } from "./BucketPanel";

type Filter = "all" | DepartmentId;

const DEPT_ICON: Record<DepartmentId, React.ReactNode> = {
  security: <Shield size={16} />,
  intelligence: <Chip size={16} />,
  creative: <Film size={16} />,
};

export function priceLabel(s: Service, region: Region = "intl"): { amount: string; suffix: string; kicker: string } {
  const amount = formatUsd(unitPrice(s, region, 1)).replace(".00", "");
  switch (s.unit) {
    case "from": return { amount, suffix: "+", kicker: "Starting at" };
    case "monthly": return { amount, suffix: "/mo", kicker: "Retainer" };
    case "each": return s.per ? { amount, suffix: `/${s.per}`, kicker: `Per ${s.per} block` } : { amount, suffix: "/each", kicker: "Per piece" };
    default: return { amount, suffix: "", kicker: "Fixed price" };
  }
}

function QtyStepper({ service }: { service: Service }) {
  const { qtyOf, setQty } = useBucket();
  const qty = qtyOf(service.id);
  const max = maxQtyFor(service);
  return (
    <div className="stepper" role="group" aria-label={`${service.name} quantity`}>
      <button type="button" onClick={() => setQty(service.id, qty - 1)} aria-label="Decrease"><Minus size={16} /></button>
      <output aria-live="polite">{qty}</output>
      <button type="button" onClick={() => setQty(service.id, qty + 1)} disabled={qty >= max} aria-label="Increase"><Plus size={16} /></button>
    </div>
  );
}

function ItemCard({ service, index }: { service: Service; index: number }) {
  const { add, qtyOf, remove, region } = useBucket();
  const qty = qtyOf(service.id);
  const isPiece = maxQtyFor(service) > 1;
  const price = priceLabel(service, region);
  const note = priceNote(service, region);
  const isLocal = Boolean(service.regional?.[region]);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <article className={`item-card dept-${service.departmentId}${qty > 0 ? " in" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="item-art" aria-hidden="true">
        <span className="item-tag">{DEPT_ICON[service.departmentId]}{DEPARTMENTS.find((d) => d.id === service.departmentId)?.name}</span>
        {qty > 0 && <span className="item-in"><Check size={13} /> {isPiece ? `${qty} in bucket` : "In bucket"}</span>}
      </div>
      <div className="item-body">
        <h3>{service.name}</h3>
        <p>{service.summary}</p>
        <ul>{service.includes.slice(0, 3).map((x) => <li key={x}><Check size={13} />{x}</li>)}</ul>
      </div>
      <div className="item-foot">
        <div className="item-price">
          <small>{price.kicker}</small>
          <b>{price.amount}<em>{price.suffix}</em></b>
          {note && <span className="item-deal">{note}</span>}
          {isLocal && !note && region === "zw" && <span className="item-deal">Zimbabwe price</span>}
          <span className="item-days"><Clock size={13} /> ~{service.deliveryDays} day{service.deliveryDays === 1 ? "" : "s"}</span>
        </div>
        {qty > 0 && isPiece ? (
          <QtyStepper service={service} />
        ) : qty > 0 ? (
          <button type="button" className="add-btn added" onClick={() => remove(service.id)} aria-label={`Remove ${service.name}`}><Check size={16} /> Added</button>
        ) : (
          <button ref={btn} type="button" className="add-btn" onClick={() => add(service.id, btn.current)} aria-label={`Add ${service.name} to bucket`}><Plus size={16} /> Add</button>
        )}
      </div>
    </article>
  );
}

export function PricingBuilder() {
  const params = useSearchParams();
  const { services, add, region, country } = useBucket();
  const initial = params.get("dept");
  const [filter, setFilter] = useState<Filter>(DEPARTMENTS.some((d) => d.id === initial) ? (initial as DepartmentId) : "all");

  // /pricing?add=<serviceId> (from landing links) drops that item straight into the bucket once.
  const added = useRef(false);
  useEffect(() => {
    const id = params.get("add");
    if (id && !added.current && services.some((s) => s.id === id)) {
      added.current = true;
      add(id);
    }
  }, [params, services, add]);

  const depts = DEPARTMENTS.filter((d) => filter === "all" || d.id === filter);

  return (
    <div className="builder">
      <div className="builder-main">
        <div className="region-bar" aria-live="polite">
          <span>Prices for</span>
          <b className="region-pill">{REGIONS.find((r) => r.id === region)?.label ?? "International"}</b>
          <small>{country ? `Based on your location (${country}).` : "Based on your location."} Zimbabwe prices apply to clients in Zimbabwe.</small>
        </div>
        <div className="filter-bar" role="tablist" aria-label="Filter by department">
          {[{ id: "all" as const, name: "Everything" }, ...DEPARTMENTS].map((d) => (
            <button key={d.id} type="button" role="tab" aria-selected={filter === d.id} onClick={() => setFilter(d.id)}>
              {d.id !== "all" && DEPT_ICON[d.id]}{d.name}
              <span>{d.id === "all" ? services.length : services.filter((s) => s.departmentId === d.id).length}</span>
            </button>
          ))}
        </div>
        {depts.map((d) => {
          const list = services.filter((s) => s.departmentId === d.id);
          const packs = list.filter((s) => s.unit !== "each");
          const pieces = list.filter((s) => s.unit === "each");
          return (
            <section key={`${filter}-${d.id}`} className="dept-block" aria-labelledby={`h-${d.id}`}>
              <header className="dept-head">
                <h2 id={`h-${d.id}`}>{d.name}</h2>
                <p>{d.tagline}</p>
              </header>
              {packs.length > 0 && (
                <>
                  <h3 className="group-label">Packages</h3>
                  <div className="item-grid">{packs.map((s, i) => <ItemCard key={s.id} service={s} index={i} />)}</div>
                </>
              )}
              {pieces.length > 0 && (
                <>
                  <h3 className="group-label">À la carte · pick quantities</h3>
                  <div className="item-grid">{pieces.map((s, i) => <ItemCard key={s.id} service={s} index={i + packs.length} />)}</div>
                </>
              )}
            </section>
          );
        })}
      </div>
      <BucketPanel />
      <MobileBucket />
    </div>
  );
}
