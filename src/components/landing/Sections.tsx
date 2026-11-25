import Link from "next/link";
import type { CSSProperties } from "react";
import { DEPARTMENTS } from "@/lib/catalog";
import { waLink } from "@/lib/config";
import { ArrowUpRight, Leaf } from "../Icons";

const DEPT_BG: Record<string, string> = {
  security:
    "radial-gradient(70% 60% at 85% 15%, rgba(255,77,61,.55), transparent 60%), linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px) 0 0/34px 34px, linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px) 0 0/34px 34px, linear-gradient(160deg, #1b1b1d, #0a0a0b)",
  intelligence:
    "radial-gradient(80% 70% at 100% 0%, rgba(200,245,59,.45), transparent 55%), radial-gradient(60% 60% at 0% 100%, rgba(120,150,130,.6), transparent 60%), linear-gradient(160deg, #3d4a42, #1a201c)",
  creative:
    "radial-gradient(70% 70% at 80% 20%, rgba(255,200,160,.55), transparent 55%), radial-gradient(90% 80% at 10% 100%, rgba(123,140,255,.85), transparent 60%), linear-gradient(170deg, #5869d9, #23264d)",
};

export function Departments() {
  return (
    <section className="section" id="departments" aria-labelledby="dept-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Three departments · One studio</span>
            <h2 id="dept-title">Built for what you can&rsquo;t see.</h2>
          </div>
          <p>Each department runs its own room, team and AI workers, so your project gets specialists from first brief to final handover.</p>
        </div>
        <div className="depts">
          {DEPARTMENTS.map((d, i) => (
            <Link
              key={d.id}
              href={`/#pricing`}
              className="dept"
              style={{ "--dept-bg": DEPT_BG[d.id], "--dept-accent": d.accent } as CSSProperties}
            >
              <div>
                <span className="num">0{i + 1} / {d.id.toUpperCase()}</span>
              </div>
              <span className="go" aria-hidden="true"><ArrowUpRight /></span>
              <div>
                <h3>{d.name}</h3>
                <p>{d.tagline}</p>
                <ul>{d.disciplines.map((x) => <li key={x}>{x}</li>)}</ul>
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
            <h2 id="zf-title">ZiFarm<wbr />Chain</h2>
            <p>Farm-to-market traceability and finance on one ledger. Farmers, buyers and input suppliers share verified records of what was planted, sold and paid, so credit and trade move on trust.</p>
            <div className="hero-actions" style={{ marginTop: 26 }}>
              <a className="btn btn-lime" href={waLink("Hi R1VLE, please add me to the ZiFarmChain early access list.")} target="_blank" rel="noopener noreferrer">
                <span>Join early access</span><span className="arrow"><ArrowUpRight size={16} /></span>
              </a>
              <a className="btn btn-plain" style={{ color: "#fff" }} href="https://zifarmchain.com" target="_blank" rel="noopener noreferrer">zifarmchain.com</a>
            </div>
          </div>
          <div className="product-cards" aria-label="ZiFarmChain highlights">
            <div className="glass-dark"><div className="k">Traceable records</div><div className="v">Field→Market</div></div>
            <div className="glass-dark"><div className="k">Settlement</div><div className="v">USD · Mobile</div></div>
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
  { title: "Pick & negotiate", text: "Choose a package or ask for a custom quote on WhatsApp." },
  { title: "Place the order", text: "We generate your invoice and a private tracking code instantly." },
  { title: "Pay 50% deposit", text: "EcoCash USD or bank. Work starts the moment it lands." },
  { title: "Track live", text: "Enter your code any time to see stage, progress and notes." },
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
              <h2 id="process-title">From brief to done, in the open.</h2>
            </div>
            <p>No chasing for updates. Every order gets an invoice number and a tracking code you can check from your phone.</p>
          </div>
          <ol className="steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
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
