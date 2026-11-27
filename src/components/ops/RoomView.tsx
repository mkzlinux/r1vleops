"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEPARTMENTS, servicesFor } from "@/lib/catalog";
import { getRepository } from "@/lib/data";
import { checkPayment } from "@/lib/data/paymentsApi";
import { formatUsd, orderTotals, stageLabel } from "@/lib/orders";
import { clientsFrom, isActive, ordersFor, summarize } from "@/lib/opsStats";
import type { DepartmentId, Order } from "@/lib/types";
import { OpsFrame, OpsSky } from "./OpsFrame";
import { ClientsList, OrderDrawer, PriceList, TeamList } from "./RoomPanels";
import { useOpsData } from "./useOpsData";

export type RoomId = DepartmentId | "hq";
type Tab = "requests" | "projects" | "clients" | "team" | "pricing";

const ROOM_META: Record<RoomId, { name: string; accent: string; blurb: string }> = {
  security: { name: "Security", accent: "#ff5a4f", blurb: "Audits, pentests and monitoring for the systems people trust." },
  intelligence: { name: "Intelligence", accent: "#c8f53b", blurb: "Fintech, software, blockchain and applied AI." },
  creative: { name: "Creative Studio", accent: "#8e9bff", blurb: "Flyers, posters, brand, motion and cinematics." },
  hq: { name: "Team & HQ", accent: "#c8f53b", blurb: "Every client, the whole crew, hiring and prices." },
};

export function isRoomId(v: string): v is RoomId {
  return v === "hq" || DEPARTMENTS.some((d) => d.id === v);
}

function OrderRow({ order, isOpen, onOpen }: { order: Order; isOpen: boolean; onOpen: () => void }) {
  return (
    <button type="button" className={`g-row click${isOpen ? " on" : ""}`} onClick={onOpen}>
      <span className={`stage-dot ${order.stage}`} />
      <div className="g-grow">
        <b>{order.client.company || order.client.name}</b>
        <small>{order.lines.map((l) => (l.qty > 1 ? `${l.qty}× ${l.name}` : l.name)).join(" + ")} · {stageLabel(order.stage)}</small>
      </div>
      <div className="g-row-end"><b>{formatUsd(orderTotals(order).total).replace(".00", "")}</b><small>{order.progress}%</small></div>
    </button>
  );
}

export function RoomView({ room }: { room: RoomId }) {
  const router = useRouter();
  const params = useSearchParams();
  const { orders, workers, services, quotes, error, run } = useOpsData();
  const meta = ROOM_META[room];
  const isHq = room === "hq";
  const [tab, setTab] = useState<Tab>(isHq ? "team" : "requests");
  const [openId, setOpenId] = useState<string | null>(params.get("order"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openId) setOpenId(null); else router.push("/ops");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, router]);

  const scoped = useMemo(() => (isHq ? orders : ordersFor(orders, room as DepartmentId)), [orders, room, isHq]);
  const crew = isHq ? workers : workers.filter((w) => w.departmentId === room);
  const s = summarize(scoped);
  const requests = scoped.filter((o) => o.stage === "awaiting_deposit");
  const projects = scoped.filter((o) => isActive(o) || o.stage === "delivered");
  const openOrder = orders.find((o) => o.id === openId) ?? null;
  const roomServices = isHq ? services : servicesFor(room as DepartmentId, services);
  const repo = getRepository();

  const headline = s.requests > 0 ? `${s.requests} request${s.requests === 1 ? "" : "s"} waiting` : s.active > 0 ? `${s.active} in production` : "All clear";
  const tabs: readonly { id: Tab; label: string }[] = [
    { id: "requests", label: `Requests ${requests.length}` },
    { id: "projects", label: `Projects ${projects.length}` },
    { id: "clients", label: "Clients" },
    { id: "team", label: "Team" },
    { id: "pricing", label: "Pricing" },
  ];
  const list = (items: readonly Order[], empty: string) =>
    items.length === 0 ? <p className="g-empty">{empty}</p> : items.map((o) => <OrderRow key={o.id} order={o} isOpen={o.id === openId} onOpen={() => setOpenId(o.id)} />);

  return (
    <OpsFrame active={room} alerts={summarize(orders).requests + quotes.filter((q) => q.status === "open").length}>
      <div className={`room-grid${openOrder ? " with-drawer" : ""}`}>
        <section className="room-main">
          <OpsSky accent={meta.accent} strikeTarget={{ x: 0.82, y: 0.35 }} className="room-hero">
            <span className="ops-chip" style={{ "--dept": meta.accent } as React.CSSProperties}><i />{meta.name}</span>
            <h1>{headline}</h1>
            <p>{error ?? meta.blurb}</p>
            <div className="room-kpis">
              <div><b>{s.requests}</b><small>New requests</small></div>
              <div><b>{s.active}</b><small>In production</small></div>
              <div><b>{formatUsd(s.pipelineUsd).replace(".00", "")}</b><small>Open value</small></div>
              <div><b>{crew.length}</b><small>Crew</small></div>
            </div>
          </OpsSky>
          <div className="room-panel">
            <div className="g-tabs" role="tablist">
              {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="g-list" role="tabpanel">
              {tab === "requests" && list(requests, "No new requests. Orders awaiting deposit land here.")}
              {tab === "projects" && list(projects, "Nothing in production yet.")}
              {tab === "clients" && <ClientsList clients={clientsFrom(scoped)} orders={scoped} onOpen={setOpenId} />}
              {tab === "team" && <TeamList workers={crew} defaultDept={isHq ? "hq" : (room as DepartmentId)} onHire={(input) => run(() => repo.hireWorker(input))} />}
              {tab === "pricing" && <PriceList services={roomServices} onSave={(id, price) => run(() => repo.updateServicePrice(id, price))} />}
            </div>
          </div>
        </section>
        {openOrder && (
          <OrderDrawer
            key={`${openOrder.id}-${openOrder.updates.length}`}
            order={openOrder}
            workers={workers}
            onClose={() => setOpenId(null)}
            onAdvance={(change) => run(() => repo.advanceOrder(openOrder.id, change))}
            onAssign={(id) => run(() => repo.assignWorker(openOrder.id, id))}
            onRecheck={repo.mode === "cloudflare" ? (paymentId) => run(() => checkPayment(openOrder.trackingCode, paymentId)) : undefined}
          />
        )}
      </div>
    </OpsFrame>
  );
}
