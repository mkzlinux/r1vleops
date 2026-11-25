import Link from "next/link";
import { DEPARTMENTS, SERVICES } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import { formatUsd } from "@/lib/orders";
import type { DepartmentId } from "@/lib/types";
import { ArrowUpRight, Bot, Chip, Clock, Film, Leaf, Shield, Sparkle } from "../Icons";

const CAPABILITIES = [
  "Penetration testing", "Smart contracts", "AI agents", "Flyers & posters", "Fintech rails", "Motion graphics",
  "Security audits", "Web & mobile apps", "Brand identity", "Cinematics", "Stablecoin payments", "Threat monitoring",
];

export function Marquee() {
  const row = [...CAPABILITIES, ...CAPABILITIES];
  return (
    <div className="marquee" aria-label="What we do">
      <div className="marquee-track">
        {row.map((c, i) => (
          <span key={`${c}-${i}`} aria-hidden={i >= CAPABILITIES.length}><Sparkle size={16} />{c}</span>
        ))}
      </div>
    </div>
  );
}

export function AboutBento() {
  return (
    <section className="section about" aria-labelledby="about-title">
      <div className="wrap">
        <span className="eyebrow center">About R1VLE</span>
        <h2 id="about-title" className="about-title">
          A studio built to make the <span className="pill-ico dark"><Shield size={18} /></span> invisible
          work <span className="pill-ico lime"><Sparkle size={18} /></span> <span className="accent">beautifully</span> for you.
        </h2>
        <div className="bento">
          <div className="b-card b-metal">
            <small>Departments</small>
            <b>03</b>
            <ul>{DEPARTMENTS.map((d) => <li key={d.id}><span style={{ background: d.accent }} />{d.name}</li>)}</ul>
          </div>
          <div className="b-card b-white">
            <small>Commitment</small>
            <b>50%</b>
            <p>Pay half to start, the balance on delivery. Every order gets an invoice number and a private tracking code.</p>
          </div>
          <div className="b-card b-lime">
            <small>AI workforce</small>
            <b>5</b>
            <p>SENTINEL, ATLAS, QUANT, MUSE and LEDGER work alongside the founder around the clock.</p>
            <span className="b-bot"><Bot size={22} /></span>
          </div>
          <div className="b-card b-dark-sm">
            <small>Clients track</small>
            <b>Live</b>
            <span className="b-arrow"><ArrowUpRight size={18} /></span>
          </div>
        </div>
      </div>
    </section>
  );
}

const DEPT_ICONS: Record<DepartmentId, React.ReactNode> = { security: <Shield size={15} />, intelligence: <Chip size={15} />, creative: <Film size={15} /> };

function fromPrice(id: DepartmentId): string {
  const prices = SERVICES.filter((s) => s.departmentId === id).map((s) => s.priceUsd);
  return formatUsd(Math.min(...prices)).replace(".00", "");
}

function deliveryRange(id: DepartmentId): string {
  const days = SERVICES.filter((s) => s.departmentId === id).map((s) => s.deliveryDays);
  return `${Math.min(...days)}–${Math.max(...days)} days`;
}

export function Departments() {
  return (
    <section className="section" id="departments" aria-labelledby="dept-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Three departments · one studio</span>
            <h2 id="dept-title">Departments that <span className="accent">deliver.</span></h2>
          </div>
          <Link href="/pricing" className="btn btn-plain see-all">See all services <ArrowUpRight size={16} /></Link>
        </div>
        <div className="dept-cards">
          {DEPARTMENTS.map((d) => (
            <Link key={d.id} href={`/pricing?dept=${d.id}`} className={`dept-card dc-${d.id}`}>
              <div className="dc-art" aria-hidden="true">
                <span className="dc-tag">{DEPT_ICONS[d.id]}{d.name}</span>
                <span className="dc-go"><ArrowUpRight size={18} /></span>
                <span className="dc-shape" />
              </div>
              <div className="dc-body">
                <h3>{d.name}</h3>
                <p>{d.tagline}</p>
                <div className="dc-chips">{d.disciplines.map((x) => <span key={x}>{x}</span>)}</div>
                <div className="dc-meta">
                  <span><b>{fromPrice(d.id)}</b><small>From</small></span>
                  <span><Clock size={16} /><b>{deliveryRange(d.id)}</b></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ZiFarmChain() {
  return (
    <section className="section" id="zifarmchain" aria-labelledby="zf-title" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="product">
          <div>
            <span className="chip"><span className="dot" />Our first product · launching soon</span>
            <h2 id="zf-title">ZiFarm<span className="accent">Chain</span></h2>
            <p>Farm-to-market traceability and finance on one ledger. Farmers, buyers and input suppliers share verified records of what was planted, sold and paid, so credit and trade move on trust.</p>
            <div className="hero-actions" style={{ marginTop: 26 }}>
              <a className="btn btn-lime" href={waLink("Hi R1VLE, please add me to the ZiFarmChain early access list.")} target="_blank" rel="noopener noreferrer">
                <span>Join early access</span><span className="arrow"><ArrowUpRight size={16} /></span>
              </a>
              <a className="btn btn-plain" style={{ color: "#fff" }} href="https://zifarmchain.com" target="_blank" rel="noopener noreferrer">zifarmchain.com</a>
            </div>
          </div>
          <div className="product-cards" aria-label="ZiFarmChain highlights">
            <div className="glass-dark"><div className="k">Traceable records</div><div className="v">Field → Market</div></div>
            <div className="glass-dark"><div className="k">Settlement</div><div className="v">USD · USDC</div></div>
            <div className="glass-dark wide">
              <div><div className="k">Built by</div><div className="v" style={{ fontSize: 22 }}>R1VLE Intelligence</div></div>
              <Leaf size={40} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Fill your bucket", text: "Pick packages or single pieces: one pentest, ten flyers, an app." },
  { title: "Negotiate or check out", text: "Talk the total through on WhatsApp, or check out for an instant invoice." },
  { title: "Pay 50% to start", text: "Work begins the moment your deposit is confirmed." },
  { title: "Track it live", text: "Your private code shows stage, progress and notes, any time." },
  { title: "Deliver & settle", text: "Review, approve, pay the balance, receive everything." },
];

export function Process() {
  return (
    <section className="section" id="process" aria-labelledby="process-title" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="process">
          <div className="section-head">
            <div>
              <span className="eyebrow">How it works</span>
              <h2 id="process-title">From bucket to <span className="accent">done.</span></h2>
            </div>
            <p>No chasing for updates. Every order gets an invoice number and a tracking code you can check from your phone.</p>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li className="step" key={s.title}>
                <span className="n">0{i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function IdeaBanner() {
  return (
    <section className="section" aria-labelledby="idea-title" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="idea">
          <div className="idea-copy">
            <span className="chip dark"><span className="dot" />Become part of it</span>
            <h2 id="idea-title">Got an <span className="accent">idea?</span></h2>
            <p>Bring the brief, your logo and a rough budget. We&rsquo;ll turn it into something people can see, use and trust.</p>
            <Link href="/pricing" className="btn btn-lime"><span>Fill your bucket</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
          </div>
          <div className="idea-art" aria-hidden="true"><span className="ring" /><span className="ring r2" /><span className="core" /></div>
        </div>
      </div>
    </section>
  );
}
