"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { COMPANY } from "@/lib/catalog";
import { DEFAULT_WA_MESSAGE, waLink } from "@/lib/config";
import { useBucket } from "../bucket/BucketProvider";
import { ArrowUpRight, BucketIcon, WhatsApp } from "../Icons";

export function Brand({ tone = "dark", height = 22, href = "/" }: { tone?: "dark" | "light"; height?: number; href?: string }) {
  return (
    <Link href={href} className="brand" aria-label={href === "/" ? "R1VLE home" : "R1VLE Ops home"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/brand/r1vle-wordmark-${tone === "dark" ? "black" : "white"}.png`} alt="R1VLE" width={Math.round(height * 4.05)} height={height} className="logo-img" />
    </Link>
  );
}

/** Bucket button with live count; it is also the landing spot for the fly-to-bucket animation. */
export function BucketButton({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { count, pulse } = useBucket();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || pulse === 0) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }, [pulse]);
  return (
    <Link href="/pricing" className={`bucket-btn ${variant}`} aria-label={`Your bucket, ${count} item${count === 1 ? "" : "s"}`}>
      <span ref={ref} className="bucket-ico" data-bucket-target><BucketIcon size={19} /></span>
      {count > 0 && <span className="badge-count">{count}</span>}
    </Link>
  );
}

const LINKS = [
  { href: "/#departments", label: "Departments" },
  { href: "/#process", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/orders", label: "My orders" },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <header className="site-nav">
      <div className="wrap site-nav-inner">
        <Brand />
        <nav className="site-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? "on" : ""}>{l.label}</Link>
          ))}
        </nav>
        <div className="site-cta">
          <BucketButton />
          <Link href="/pricing" className="btn btn-dark hide-sm">
            <span>Build your bucket</span><span className="arrow"><ArrowUpRight size={16} /></span>
          </Link>
        </div>
      </div>
    </header>
  );
}

const STATS = [
  { v: "3", k: "departments under one roof" },
  { v: "1", k: "studio, one point of contact" },
  { v: "50%", k: "deposit to start, balance on delivery" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-band">
          <p className="foot-lead">Our promise<br />to builders</p>
          {STATS.map((s) => (
            <div key={s.k} className="foot-stat"><b>{s.v}</b><span>{s.k}</span></div>
          ))}
          <Link href="/pricing" className="btn btn-outline-signal">Start a project</Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/r1vle-logo-white.png" alt="R1VLE — Infrastructure behind the invisible" width={900} height={275} className="foot-logo" />
        <div className="foot-row">
          <span>© {new Date().getFullYear()} {COMPANY.legalName}</span>
          <nav aria-label="Footer">
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            <a href={waLink(DEFAULT_WA_MESSAGE)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <Link href="/pricing">Pricing</Link>
            <Link href="/track">Track</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/nda">NDA</Link>
            <Link href="/ops">Ops</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab() {
  return (
    <a className="wa-fab" href={waLink(DEFAULT_WA_MESSAGE)} target="_blank" rel="noopener noreferrer" aria-label="Chat with R1VLE on WhatsApp">
      <WhatsApp size={28} />
    </a>
  );
}
