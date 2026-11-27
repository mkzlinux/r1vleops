"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEPARTMENTS } from "@/lib/catalog";
import { formatUsd, orderTotals, stageLabel } from "@/lib/orders";
import { dailyActivity, forecast } from "@/lib/opsForecast";
import { depositPosition, ordersFor, summarize } from "@/lib/opsStats";
import type { DayActivity } from "@/lib/opsForecast";
import { ArrowUpRight, Bot, Chip, Coin, Film, Shield, Users } from "../Icons";
import { OpsFrame, OpsSky } from "./OpsFrame";
import { useOpsData } from "./useOpsData";

const DEPT_ICON = { security: <Shield size={16} />, intelligence: <Chip size={16} />, creative: <Film size={16} /> } as const;

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smoothPath(pts: readonly [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Timeline({ days, markerRef }: { days: readonly DayActivity[]; markerRef: React.RefObject<HTMLDivElement | null> }) {
  const W = 1000;
  const H = 120;
  const max = Math.max(1, ...days.map((d) => d.value));
  const step = W / days.length;
  const pts: [number, number][] = days.map((d, i) => [step * i + step / 2, H - 20 - (d.value / max) * (H - 50)]);
  const line = smoothPath([[0, pts[0][1]], ...pts, [W, pts[pts.length - 1][1]]]);
  const todayIdx = days.findIndex((d) => d.isToday);
  return (
    <div className="timeline" aria-label="Activity over the last 7 days">
      <div className="tl-values">
        {days.map((d) => (
          <div key={d.label + d.isToday} className={d.isToday ? "today" : ""}>
            <b>{d.value}</b><span>{d.value === 0 ? "calm" : d.value > 2 ? "busy" : "active"}</span>
          </div>
        ))}
      </div>
      <div className="tl-wave">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="tl-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="rgba(255,255,255,.22)" /><stop offset="1" stopColor="rgba(255,255,255,0)" /></linearGradient>
          </defs>
          <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill="url(#tl-fill)" />
          <path d={line} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {todayIdx >= 0 && (
          <div ref={markerRef} className="tl-marker" style={{ left: `${((todayIdx + 0.5) / days.length) * 100}%`, top: `${(pts[todayIdx][1] / H) * 100}%` }} />
        )}
      </div>
      <div className="tl-days">{days.map((d) => <span key={d.label + d.isToday} className={d.isToday ? "today" : ""}>{d.isToday ? "Today" : d.label}</span>)}</div>
    </div>
  );
}

export function Overview() {
  const { orders, workers, quotes, isLoading, error } = useOpsData();
  const openDeals = quotes.filter((q) => q.status === "open");
  const now = useMemo(() => new Date(), []);
  const fc = forecast(orders, now);
  const days = dailyActivity(orders, now, 7);
  const total = summarize(orders);
  const deposits = depositPosition(orders);
  const live = orders.filter((o) => o.stage !== "closed").slice(0, 8);

  const markerRef = useRef<HTMLDivElement>(null);
  const [strike, setStrike] = useState({ x: 0.6, y: 0.6 });
  useEffect(() => {
    const place = () => {
      const m = markerRef.current?.getBoundingClientRect();
      const f = document.querySelector(".ops-sky")?.getBoundingClientRect();
      if (m && f) setStrike({ x: (m.left + m.width / 2 - f.left) / f.width, y: (m.top + m.height / 2 - f.top) / f.height });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [orders.length]);

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <OpsFrame active="overview" alerts={total.requests + openDeals.length}>
      <div className="ops-head">
        <div>
          <span className="eyebrow" suppressHydrationWarning>{greeting} · {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
          <h2 className="ops-title">Today at <span className="accent mark">R1VLE.</span></h2>
        </div>
        <Link href="/pricing" className="btn btn-dark"><span>New order</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
      </div>

      <div className="ops-grid">
        <OpsSky strikeTarget={strike} className="ops-hero">
          <span className="ops-chip"><i />Operations forecast</span>
          <h1 id="ops-title">{isLoading ? "Reading the sky…" : fc.headline}</h1>
          <p>{error ?? fc.summary}</p>
          <Timeline days={days} markerRef={markerRef} />
        </OpsSky>

        <aside className="ops-cards" aria-label="Summary">
          <div className="o-card lime">
            <div className="o-label"><Coin size={16} /> Open pipeline</div>
            <div className="o-big">{formatUsd(total.pipelineUsd).replace(".00", "")}</div>
            <div className="o-meta">
              <span><Users size={14} /> {total.clients} clients</span>
              <span>{formatUsd(deposits.collected).replace(".00", "")} collected</span>
              <span><Bot size={14} /> {workers.filter((w) => w.kind === "ai").length} AI workers</span>
            </div>
          </div>
          {DEPARTMENTS.map((d) => {
            const s = summarize(ordersFor(orders, d.id));
            return (
              <Link key={d.id} href={`/ops/${d.id}`} className={`o-card dept dc-${d.id}`}>
                <span className="o-ico">{DEPT_ICON[d.id]}</span>
                <div className="o-grow">
                  <b>{d.name}</b>
                  <small>{s.requests > 0 ? `${s.requests} new request${s.requests === 1 ? "" : "s"}` : s.active > 0 ? "In production" : "All clear"}</small>
                </div>
                <div className="o-num">{s.active + s.requests}</div>
                <span className="o-go"><ArrowUpRight size={16} /></span>
              </Link>
            );
          })}
          <Link href="/ops/deals" className="o-card dept dc-deals">
            <span className="o-ico"><Coin size={16} /></span>
            <div className="o-grow">
              <b>Deals</b>
              <small>{openDeals.length > 0 ? `${openDeals.length} negotiation${openDeals.length === 1 ? "" : "s"} waiting` : "No open negotiations"}</small>
            </div>
            <div className="o-num">{openDeals.length}</div>
            <span className="o-go"><ArrowUpRight size={16} /></span>
          </Link>
        </aside>
      </div>

      <section className="ops-strip" id="requests" aria-labelledby="live-title">
        <div className="ops-strip-head"><h3 id="live-title">Live orders</h3><span className="dim">{live.length} open</span></div>
        {live.length === 0 ? <p className="dim">No open orders yet. New orders appear here the moment a client checks out.</p> : (
          <div className="live-orders">
            {live.map((o) => (
              <Link key={o.id} href={`/ops/${o.departmentId}?order=${o.id}`} className="live-chip">
                <span className={`stage-dot ${o.stage}`} />
                <span className="lc-main"><b>{o.client.company || o.client.name}</b><small>{stageLabel(o.stage)} · {o.progress}%</small></span>
                <span className="lc-amt">{formatUsd(orderTotals(o).total).replace(".00", "")}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </OpsFrame>
  );
}
