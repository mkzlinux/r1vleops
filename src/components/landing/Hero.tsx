"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Chip, Coin, Film, Play, Shield } from "../Icons";
import { waLink } from "@/lib/config";

const HeroVisual = dynamic(() => import("./HeroVisual"), { ssr: false, loading: () => null });

const FEATURES = [
  { icon: <Shield />, title: "Security", text: "Pentests, audits and monitoring." },
  { icon: <Chip />, title: "Intelligence", text: "Fintech, software, blockchain, AI." },
  { icon: <Film />, title: "Creative Studio", text: "Design, motion and cinematics." },
  { icon: <Coin />, title: "Start at 50%", text: "Pay half to start, track every step." },
];

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap">
        <div className="hero-grid">
          <div>
            <span className="chip"><span className="dot" />Infrastructure behind the invisible</span>
            <h1 id="hero-title">
              Secure.<br />Intelligent.<br /><span className="ghost">Cinematic</span><span className="red">.</span>
            </h1>
            <div className="hero-rule" aria-hidden="true"><span /><ArrowUpRight size={14} /></div>
            <p className="lede">One studio for the layer people never see: the security that protects it, the systems that run it, and the story that sells it.</p>
            <div className="hero-actions">
              <Link href="/order" className="btn btn-dark">
                <span>Start a project</span>
                <span className="arrow"><ArrowUpRight size={16} /></span>
              </Link>
              <a className="play" href={waLink("Hi R1VLE, I'd like a quick call about a project.")} target="_blank" rel="noopener noreferrer">
                <i><Play size={14} /></i> Talk on WhatsApp
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="halo" aria-hidden="true" />
            <div className="halo two" aria-hidden="true" />
            <HeroVisual />
            <div className="hero-counter" aria-hidden="true"><b>01</b><i />02<br />03</div>
            <div className="hero-badge"><span>Departments online</span><b>3 · 5 AI workers</b></div>
          </div>
        </div>
        <div className="strip">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="ico">{f.icon}</span>
              <div><h3>{f.title}</h3><p>{f.text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
