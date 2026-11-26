import Link from "next/link";
import { DEPARTMENTS } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import type { DepartmentId } from "@/lib/types";
import { ArrowUpRight, Bot, Chip, Film, Leaf, Shield, Sparkle } from "../Icons";

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

interface DeptStory {
  readonly line: string;
  readonly does: readonly string[];
  readonly gets: readonly string[];
  readonly for: readonly string[];
}

/** What each department actually does, in plain words. Prices live on /pricing only. */
const DEPT_STORY: Record<DepartmentId, DeptStory> = {
  security: {
    line: "We break in before someone else does.",
    does: ["Penetration tests on websites, apps, networks and APIs", "Security audits and hardening of servers, cloud and code", "Ongoing monitoring with a human on call when something trips"],
    gets: ["A plain-language report, ranked by real risk", "A fix-by-fix plan, then a retest to prove it", "Evidence you can show clients, banks and regulators"],
    for: ["Fintechs and payment startups", "Businesses holding customer data", "Anyone about to launch"],
  },
  intelligence: {
    line: "We build the systems that run quietly and never miss.",
    does: ["Websites, web apps and mobile apps", "Fintech rails: wallets, payments, USD and USDC settlement", "Blockchain and smart contracts", "AI agents and automations, including on WhatsApp"],
    gets: ["Working, documented software that you own", "Hosting, domains and handover set up for you", "Agents that answer customers around the clock"],
    for: ["Founders turning an idea into a product", "Businesses moving operations online", "Teams that move money"],
  },
  creative: {
    line: "We make people stop scrolling.",
    does: ["Brand identity and logos", "Flyers, posters, social packs, cards, brochures and banners", "Motion graphics and cinematic films"],
    gets: ["Print-ready and social-ready files", "Editable source files on request", "Motion cut for every platform you post on"],
    for: ["Events, churches and shops", "Brands launching or rebranding", "Products that need a story told"],
  },
};

function StoryList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="ds-col">
      <h4>{title}</h4>
      <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}

export function Departments() {
  return (
    <section className="section" id="departments" aria-labelledby="dept-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Three departments · one studio</span>
            <h2 id="dept-title">What each department <span className="accent mark">does.</span></h2>
          </div>
          <p className="ds-intro">Every project lands in one of three rooms. Each has its own crew, tools and standards, and they work together when a job needs more than one.</p>
        </div>
        <div className="dossiers">
          {DEPARTMENTS.map((d, i) => {
            const story = DEPT_STORY[d.id];
            return (
              <article key={d.id} className={`dossier dc-${d.id}`} aria-labelledby={`ds-${d.id}`}>
                <div className="dc-art ds-art" aria-hidden="true">
                  <span className="dc-tag">{DEPT_ICONS[d.id]}{d.name}</span>
                  <span className="ds-num">0{i + 1}</span>
                  <span className="dc-shape" />
                </div>
                <div className="ds-body">
                  <h3 id={`ds-${d.id}`}>{d.name}</h3>
                  <p className="ds-line">{story.line}</p>
                  <div className="ds-cols">
                    <StoryList title="What we do" items={story.does} />
                    <StoryList title="What you walk away with" items={story.gets} />
                    <StoryList title="Who calls us" items={story.for} />
                  </div>
                </div>
              </article>
            );
          })}
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
