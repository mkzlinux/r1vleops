"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { isCloudflareBackend, isSupabaseConfigured } from "@/lib/data";
import { Chip, Film, Plus, Shield, Users } from "../Icons";
import { OpsBackground } from "./OpsBackground";

export type OpsNavId = "overview" | "security" | "intelligence" | "creative" | "hq";

const NAV: readonly { id: OpsNavId; href: string; label: string; icon: ReactNode }[] = [
  { id: "overview", href: "/ops", label: "Overview", icon: <GridIcon /> },
  { id: "security", href: "/ops/security", label: "Security", icon: <Shield size={18} /> },
  { id: "intelligence", href: "/ops/intelligence", label: "Intelligence", icon: <Chip size={18} /> },
  { id: "creative", href: "/ops/creative", label: "Creative Studio", icon: <Film size={18} /> },
  { id: "hq", href: "/ops/hq", label: "Team & HQ", icon: <Users size={18} /> },
];

function GridIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>;
}

function BellIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
}

function ExitIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></svg>;
}

interface OpsFrameProps {
  readonly active: OpsNavId;
  readonly accent?: string;
  readonly strikeTarget?: { readonly x: number; readonly y: number };
  readonly alerts?: number;
  readonly children: ReactNode;
}

export function OpsFrame({ active, accent, strikeTarget, alerts = 0, children }: OpsFrameProps) {
  return (
    <div className="ops-page">
      <div className="ops-frame">
        <OpsBackground accent={accent} strikeTarget={strikeTarget} />
        <div className="ops-veil" aria-hidden="true" />
        <nav className="ops-side" aria-label="Dashboard">
          <Link href="/ops" className="ops-mark" aria-label="R1VLE Ops home">R1</Link>
          <div className="ops-side-links">
            {NAV.map((n) => (
              <Link key={n.id} href={n.href} className={active === n.id ? "on" : ""} aria-label={n.label} aria-current={active === n.id ? "page" : undefined} title={n.label}>
                {n.icon}
              </Link>
            ))}
          </div>
          <Link href="/" className="ops-exit" aria-label="Back to public site" title="Public site"><ExitIcon /></Link>
        </nav>
        <div className="ops-main">
          <header className="ops-top">
            <div className="ops-hello"><small>Welcome back</small><b>Founder · R1VLE Ops</b></div>
            <div className="ops-actions">
              <span className="ops-mode">{isSupabaseConfigured || isCloudflareBackend ? "Live data" : "Demo · this browser"}</span>
              <Link href="/pricing" className="ops-round" aria-label="New order" title="New order"><Plus size={18} /></Link>
              <Link href="/ops#requests" className="ops-round" aria-label={`${alerts} new requests`} title="New requests"><BellIcon />{alerts > 0 && <span className="ops-dot">{alerts}</span>}</Link>
              {isCloudflareBackend
                ? <button type="button" className="ops-avatar" title="Sign out" aria-label="Sign out" onClick={() => { fetch("/api/ops/logout", { method: "POST" }).finally(() => window.location.reload()); }}>R1</button>
                : <span className="ops-avatar" aria-hidden="true">R1</span>}
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
