"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  { href: "/about#products", label: "Products" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/orders", label: "My orders" },
];

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {isOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
    </svg>
  );
}

/** Sticky site header. Phones get a menu button that opens the same links. */
export function SiteNav() {
  const path = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { setIsOpen(false); }, [path]);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);
  return (
    <header className={`site-nav${isOpen ? " open" : ""}`}>
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
          <button type="button" className="menu-btn" aria-expanded={isOpen} aria-controls="site-menu" aria-label={isOpen ? "Close menu" : "Open menu"} onClick={() => setIsOpen((v) => !v)}>
            <MenuIcon isOpen={isOpen} />
          </button>
        </div>
      </div>
      <nav id="site-menu" className="site-menu" aria-label="Menu" hidden={!isOpen}>
        <div className="wrap">
          {LINKS.map((l) => <Link key={l.href} href={l.href} onClick={() => setIsOpen(false)}>{l.label}<ArrowUpRight size={16} /></Link>)}
          <Link href="/track" onClick={() => setIsOpen(false)}>Track a project<ArrowUpRight size={16} /></Link>
          <Link href="/pricing" className="btn btn-dark" onClick={() => setIsOpen(false)}><span>Build your bucket</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
        </div>
      </nav>
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
            <Link href="/about">About</Link>
            <Link href="/track">Track</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/nda">NDA</Link>
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
