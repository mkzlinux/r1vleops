"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** Signal colour for nodes, grid and strikes (lime by default, tinted per department). */
  readonly accent?: string;
  /** Where circuit-lightning lands, as fractions of the canvas (e.g. today's point on the timeline). */
  readonly strikeTarget?: { readonly x: number; readonly y: number };
}

interface Node { x: number; y: number; vx: number; vy: number; glow: number }
interface Cloud { x: number; y: number; r: number; vx: number; tone: number }
interface Strike { path: [number, number][]; born: number }

const NODE_COUNT = 64;
const LINK_DIST = 150;
const STRIKE_LIFE = 900;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Orthogonal "circuit" path from the sky down to the target, with jitter. */
function makeStrike(w: number, tx: number, ty: number): [number, number][] {
  const pts: [number, number][] = [];
  let x = tx + (Math.random() - 0.5) * w * 0.35;
  let y = -10;
  pts.push([x, y]);
  while (y < ty - 20) {
    y = Math.min(ty, y + 30 + Math.random() * 70);
    pts.push([x, y]);
    x += (tx - x) * (0.3 + Math.random() * 0.4) + (Math.random() - 0.5) * 40;
    pts.push([x, y]);
  }
  pts.push([tx, ty]);
  return pts;
}

/**
 * Animated "tech storm" backdrop: drifting cloud masses, a node network, a perspective
 * wireframe field streaming toward the viewer, and circuit-lightning striking the timeline.
 */
export function OpsBackground({ accent = "#c8f53b", strikeTarget = { x: 0.5, y: 0.6 } }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef(strikeTarget);
  target.current = strikeTarget;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const [ar, ag, ab] = hexToRgb(accent);
    const rgba = (a: number) => `rgba(${ar},${ag},${ab},${a})`;
    let w = 0;
    let h = 0;
    let raf = 0;
    let nodes: Node[] = [];
    let clouds: Cloud[] = [];
    let strikes: Strike[] = [];
    let nextStrike = performance.now() + 1500;
    let flash = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * w, y: Math.random() * h * 0.62,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.12, glow: Math.random(),
      }));
      clouds = Array.from({ length: 9 }, (_, i) => ({
        x: Math.random() * w, y: h * (0.05 + Math.random() * 0.45), r: Math.max(w, h) * (0.18 + Math.random() * 0.22),
        vx: 0.05 + Math.random() * 0.12, tone: i % 3,
      }));
    };

    const drawSky = () => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#121b1d");
      g.addColorStop(0.45, "#25393b");
      g.addColorStop(0.62, "#4c5f59");
      g.addColorStop(0.64, "#1b2622");
      g.addColorStop(1, "#0d1311");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const tones = ["rgba(10,16,18,0.55)", "rgba(60,82,84,0.35)", "rgba(28,40,42,0.5)"];
      for (const c of clouds) {
        const rg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        rg.addColorStop(0, tones[c.tone]);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      const horizon = ctx.createRadialGradient(w * 0.75, h * 0.62, 0, w * 0.75, h * 0.62, w * 0.5);
      horizon.addColorStop(0, rgba(0.18));
      horizon.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = horizon;
      ctx.fillRect(0, 0, w, h);
    };

    const drawNetwork = () => {
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(190,220,215,${0.12 * (1 - d / LINK_DIST)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(n.glow * Math.PI * 2));
        const hot = n.glow > 0.92;
        ctx.fillStyle = hot ? rgba(0.9) : `rgba(220,235,230,${0.25 + pulse * 0.35})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, hot ? 2.4 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawField = (t: number) => {
      const horizonY = h * 0.63;
      const vpX = w * 0.5;
      const depth = h - horizonY;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizonY, w, depth);
      ctx.clip();
      const rows = 22;
      const offset = reduce ? 0.3 : (t / 2600) % 1;
      for (let i = 0; i < rows; i += 1) {
        const z = (i + offset) / rows;
        const y = horizonY + depth * z * z;
        ctx.strokeStyle = rgba(0.06 + z * 0.28);
        ctx.lineWidth = 0.6 + z * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const cols = 36;
      for (let i = -cols; i <= cols; i += 1) {
        const xBottom = vpX + (i / cols) * w * 1.6;
        ctx.strokeStyle = `rgba(170,200,190,${0.05 + 0.08 * (1 - Math.abs(i) / cols)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(vpX + (xBottom - vpX) * 0.02, horizonY);
        ctx.lineTo(xBottom, h);
        ctx.stroke();
      }
      ctx.restore();
      const haze = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 60);
      haze.addColorStop(0, "rgba(120,150,140,0)");
      haze.addColorStop(0.5, "rgba(150,180,170,0.18)");
      haze.addColorStop(1, "rgba(120,150,140,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizonY - 40, w, 100);
    };

    const drawStrikes = (now: number) => {
      strikes = strikes.filter((s) => now - s.born < STRIKE_LIFE);
      for (const s of strikes) {
        const life = 1 - (now - s.born) / STRIKE_LIFE;
        const flicker = life * (0.6 + Math.random() * 0.4);
        for (const [width, alpha] of [[8, 0.12], [3, 0.5], [1.2, 1]] as const) {
          ctx.strokeStyle = rgba(alpha * flicker);
          ctx.lineWidth = width;
          ctx.beginPath();
          s.path.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.stroke();
        }
        const [ex, ey] = s.path[s.path.length - 1];
        const burst = ctx.createRadialGradient(ex, ey, 0, ex, ey, 90 * life + 10);
        burst.addColorStop(0, rgba(0.55 * life));
        burst.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = burst;
        ctx.fillRect(ex - 100, ey - 100, 200, 200);
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(220,240,230,${flash})`;
        ctx.fillRect(0, 0, w, h);
        flash = Math.max(0, flash - 0.02);
      }
    };

    const step = (now: number) => {
      for (const c of clouds) { c.x += c.vx; if (c.x - c.r > w) c.x = -c.r; }
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.glow = (n.glow + 0.004) % 1;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h * 0.62) n.vy *= -1;
      }
      if (now > nextStrike) {
        strikes.push({ path: makeStrike(w, target.current.x * w, target.current.y * h), born: now });
        flash = 0.06;
        nextStrike = now + 3800 + Math.random() * 4200;
      }
    };

    const frame = (now: number) => {
      if (!reduce) step(now);
      drawSky();
      drawNetwork();
      drawField(now);
      drawStrikes(now);
      if (!reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce) frame(performance.now()); });
    ro.observe(canvas);
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [accent]);

  return <canvas ref={canvasRef} className="ops-bg" aria-hidden="true" />;
}
