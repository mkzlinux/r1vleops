"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { isCloudflareBackend, isSupabaseConfigured } from "@/lib/data";
import { Chip, Film, Plus, Shield, Users } from "../Icons";
import { Brand } from "../site/SiteChrome";
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
  readonly alerts?: number;
  readonly children: ReactNode;
}

/** Ops shell in the landing page's language: paper page, pill nav, white and metal cards. */
export function OpsFrame({ active, alerts = 0, children }: OpsFrameProps) {
  const isLive = isSupabaseConfigured || isCloudflareBackend;
  return (
    <div className="ops-page">
      <header className="ops-nav">
        <div className="ops-nav-inner">
          <div className="ops-brand"><Brand href="/ops" height={20} /><span className="ops-tag">Ops</span></div>
          <nav className="ops-links" aria-label="Dashboard">
            {NAV.map((n) => (
              <Link key={n.id} href={n.href} className={active === n.id ? "on" : ""} aria-current={active === n.id ? "page" : undefined} title={n.label}>
                {n.icon}<span>{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="ops-actions">
            <span className={`ops-mode${isLive ? " live" : ""}`}><i />{isLive ? "Live" : "Demo"}</span>
            <Link href="/pricing" className="ops-round" aria-label="New order" title="New order"><Plus size={18} /></Link>
            <Link href="/ops#requests" className="ops-round" aria-label={`${alerts} new requests`} title="New requests"><BellIcon />{alerts > 0 && <span className="ops-dot">{alerts}</span>}</Link>
            <Link href="/" className="ops-round hide-sm" aria-label="Public site" title="Public site"><ExitIcon /></Link>
            {isCloudflareBackend
              ? <button type="button" className="ops-avatar" title="Sign out" aria-label="Sign out" onClick={() => { fetch("/api/ops/logout", { method: "POST" }).finally(() => window.location.reload()); }}>R1</button>
              : <span className="ops-avatar" aria-hidden="true">R1</span>}
          </div>
        </div>
      </header>
      <main className="ops-main">{children}</main>
    </div>
  );
}

/** Dark metal feature card with the animated tech background (the dashboard's "hero"). */
export function OpsSky({ accent, strikeTarget, className = "", children }: { accent?: string; strikeTarget?: { readonly x: number; readonly y: number }; className?: string; children: ReactNode }) {
  return (
    <section className={`ops-sky ${className}`}>
      <OpsBackground accent={accent} strikeTarget={strikeTarget} />
      <div className="ops-veil" aria-hidden="true" />
      <div className="ops-sky-body">{children}</div>
    </section>
  );
}
