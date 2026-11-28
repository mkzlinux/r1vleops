import Link from "next/link";
import "@/components/site/site.css";
import "@/components/about/about.css";
import { ArrowUpRight, Chip, Film, Shield } from "@/components/Icons";
import { SiteFooter, SiteNav, WhatsAppFab } from "@/components/site/SiteChrome";
import { DEPARTMENTS } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import { PRODUCTS } from "@/lib/products";
import type { DepartmentId } from "@/lib/types";

export const metadata = {
  title: "About",
  description: "R1VLE is a studio for the layer people never see: security, intelligent systems and cinematic creative. Makers of ZiFarmChain and Fasta.",
};

const CREED = [
  { n: "01", big: "The best breach is the one that never happens.", small: "So we attack first: your apps, your network, your people, before anyone else does." },
  { n: "02", big: "The best system is the one you forget is there.", small: "Payments that settle, apps that stay up, agents that answer at 3 a.m. Quietly." },
  { n: "03", big: "The best story is the one people retell.", small: "Design and film made to stop the scroll and stay in the room after it ends." },
];

const PRINCIPLES = [
  { t: "One point of contact", d: "You talk to the person doing the work, not a sales desk." },
  { t: "Secrets stay secret", d: "Sign our NDA online before you share anything sensitive." },
  { t: "Prices up front", d: "Every price is public. Pay half to start, the rest on delivery." },
  { t: "Nothing hidden", d: "Every project gets a private code to track progress live." },
  { t: "You own it", d: "Pay in full and the work is yours: files, code and accounts." },
];

const DEPT_ICON: Record<DepartmentId, React.ReactNode> = { security: <Shield size={20} />, intelligence: <Chip size={20} />, creative: <Film size={20} /> };

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="about-page">
        <section className="ab-hero">
          <div className="wrap">
            <span className="ab-eyebrow">About R1VLE</span>
            <h1>We work where <span className="accent">no one looks.</span></h1>
            <p className="ab-lede">R1VLE is a studio for the invisible layer: the security that protects a business, the systems that run it, and the story that sells it. Three departments, one point of contact.</p>
            <div className="ab-facts" aria-label="R1VLE at a glance">
              <div><b>03</b><span>departments</span></div>
              <div><b>02</b><span>products of our own</span></div>
              <div><b>01</b><span>point of contact</span></div>
              <div><b>50%</b><span>to start, balance on delivery</span></div>
            </div>
          </div>
        </section>

        <section className="ab-creed" aria-labelledby="creed-title">
          <div className="wrap">
            <h2 id="creed-title" className="ab-kicker">What we believe</h2>
            <ol>
              {CREED.map((c) => (
                <li key={c.n}><span className="mono">{c.n}</span><div><p className="big">{c.big}</p><p>{c.small}</p></div></li>
              ))}
            </ol>
            <p className="ab-coda">That&apos;s the invisible layer. <span className="accent">We build it.</span></p>
          </div>
        </section>

        <section className="ab-depts" aria-labelledby="depts-title">
          <div className="wrap">
            <h2 id="depts-title" className="ab-kicker">Three departments</h2>
            <div className="ab-dept-grid">
              {DEPARTMENTS.map((d) => (
                <Link key={d.id} href={`/pricing?dept=${d.id}`} className="ab-dept">
                  <span className="ico" style={{ background: d.accent }}>{DEPT_ICON[d.id]}</span>
                  <h3>{d.name}</h3>
                  <p>{d.tagline}</p>
                  <span className="go">See prices <ArrowUpRight size={15} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="ab-products" id="products" aria-labelledby="products-title">
          <div className="wrap">
            <h2 id="products-title" className="ab-kicker light">Our products</h2>
            <p className="ab-products-lede">We don&apos;t only build for clients. These are ours.</p>
            <div className="ab-prod-grid">
              {PRODUCTS.map((p, i) => (
                <article key={p.id} className="ab-prod" style={{ "--acc": p.accent } as React.CSSProperties}>
                  <div className="ab-prod-top">
                    <span className="mono">P/0{i + 1}</span>
                    <span className="status"><i />{p.status}</span>
                  </div>
                  <span className="kind">{p.kind}</span>
                  <h3>{p.name}</h3>
                  <p className="line">{p.line}</p>
                  <p>{p.about}</p>
                  <ul>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
                  <div className="ab-prod-cta">
                    <a className="btn btn-lime" href={waLink(p.cta.message)} target="_blank" rel="noopener noreferrer"><span>{p.cta.label}</span><span className="arrow"><ArrowUpRight size={16} /></span></a>
                    {p.url && <a className="ab-link" href={p.url} target="_blank" rel="noopener noreferrer">{p.url.replace(/^https?:\/\//, "")} <ArrowUpRight size={14} /></a>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ab-principles" aria-labelledby="how-title">
          <div className="wrap">
            <h2 id="how-title" className="ab-kicker">How we work</h2>
            <div className="ab-pr-grid">
              {PRINCIPLES.map((p, i) => <div key={p.t}><span className="mono">0{i + 1}</span><h3>{p.t}</h3><p>{p.d}</p></div>)}
            </div>
          </div>
        </section>

        <section className="ab-cta">
          <div className="wrap">
            <h2>Have something no one else will touch?</h2>
            <div className="hero-actions">
              <Link href="/request" className="btn btn-lime"><span>Request anything</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
              <Link href="/pricing" className="btn btn-outline-signal">Build your bucket</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
