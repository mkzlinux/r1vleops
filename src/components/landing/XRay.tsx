"use client";

import { useEffect, useRef, type ReactNode } from "react";

const LENS = 170;

/**
 * "See the invisible": a lens that follows the pointer and reveals a blueprint twin of the hero
 * (wireframe type, schematic portal, circuitry and system labels). Drifts on its own on touch
 * devices; holds still for reduced motion.
 */
export function XRayHero({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let raf = 0;
    let target = { x: 0.62, y: 0.42 };
    let pos = { ...target };
    let lastMove = 0;
    const set = () => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", `${pos.x * r.width}px`);
      el.style.setProperty("--ly", `${pos.y * r.height}px`);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      lastMove = performance.now();
      el.classList.add("xray-on");
    };
    const tick = (now: number) => {
      if (!finePointer || now - lastMove > 2500) {
        const t = now / 1000;
        target = { x: 0.5 + Math.sin(t * 0.35) * 0.32, y: 0.45 + Math.sin(t * 0.53) * 0.22 };
      }
      pos = { x: pos.x + (target.x - pos.x) * 0.12, y: pos.y + (target.y - pos.y) * 0.12 };
      set();
      raf = requestAnimationFrame(tick);
    };
    set();
    if (!reduce) raf = requestAnimationFrame(tick);
    el.addEventListener("pointermove", onMove);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", onMove); };
  }, []);
  return (
    <div ref={host} className="xray-host" style={{ "--lr": `${LENS}px` } as React.CSSProperties}>
      {children}
    </div>
  );
}

/** The blueprint twin, positioned over the hero grid and revealed only inside the lens. */
export function XRayLayer() {
  return (
    <div className="xray-layer" aria-hidden="true">
      <svg className="xray-circuit" viewBox="0 0 1200 700" preserveAspectRatio="none">
        <defs>
          <pattern id="xg" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(200,245,59,.12)" strokeWidth="1" /></pattern>
        </defs>
        <rect width="1200" height="700" fill="url(#xg)" />
        <g fill="none" stroke="rgba(200,245,59,.55)" strokeWidth="1.4">
          <path d="M0 120H180V260H420V180H560" /><path d="M0 520H120V430H330V600H600" /><path d="M560 180V90H760" />
          <path d="M1200 140H1040V300H900" /><path d="M1200 560H980V470H820V640" /><path d="M600 600H760V520" />
        </g>
        <g fill="#c8f53b">{[[180, 120], [420, 260], [560, 180], [120, 520], [330, 430], [1040, 140], [900, 300], [980, 560], [820, 470], [760, 520]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />)}</g>
      </svg>
      <div className="wrap hero-grid xray-grid">
        <div className="hero-copy">
          <span className="chip">// infrastructure.behind(&quot;invisible&quot;)</span>
          <h1>Secure.<br />Intelligent.<br /><span className="accent">Cinematic.</span></h1>
          <div className="hero-rule"><span /></div>
          <p className="lede">auth.session ✓ tls 1.3 · ledger.verify() → 0x7f…a2 · agents.online 5/5 · render.cinematic(4k)</p>
          <div className="hero-actions">
            <span className="btn btn-ghost-x">build_bucket()</span>
            <span className="btn btn-ghost-x">whatsapp.open()</span>
          </div>
        </div>
        <div className="hero-stage">
          <svg className="xray-portal" viewBox="0 0 400 400">
            <g fill="none" stroke="#c8f53b" strokeWidth="1.5">
              <rect x="70" y="70" width="260" height="260" rx="80" />
              <rect x="120" y="120" width="160" height="160" rx="46" strokeDasharray="6 6" />
              <rect x="178" y="178" width="44" height="44" rx="8" />
              <path d="M70 360H330M70 352V368M330 352V368" /><path d="M360 70V330M352 70H368M352 330H368" />
              <path d="M200 0V60M200 340V400M0 200H60M340 200H400" strokeDasharray="2 6" />
            </g>
            <g fill="#c8f53b" fontFamily="monospace" fontSize="11">
              <text x="168" y="384">260 u</text><text x="372" y="204">260</text>
              <text x="132" y="112">core: signal</text><text x="232" y="300">glass ior 1.35</text>
            </g>
          </svg>
        </div>
      </div>
      <span className="xray-hint">move to see the invisible</span>
    </div>
  );
}
