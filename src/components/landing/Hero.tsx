"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { waLink } from "@/lib/config";
import { ArrowUpRight, Chip, Coin, Film, Pen, Play, Shield } from "../Icons";

const HeroVisual = dynamic(() => import("./HeroVisual"), { ssr: false, loading: () => null });

const FEATURES = [
  { icon: <Shield />, title: "Security", text: "Pentests, audits and monitoring." },
  { icon: <Chip />, title: "Intelligence", text: "Fintech, software, blockchain, AI." },
  { icon: <Film />, title: "Creative Studio", text: "Flyers, posters, motion, cinema." },
  { icon: <Coin />, title: "50% to start", text: "Invoice + tracking code instantly." },
];

function MiniRing({ value }: { value: number }) {
  const c = 2 * Math.PI * 15;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(14,15,17,.1)" strokeWidth="5" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#b4e41f" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 20 20)" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="chip"><span className="dot" />Infrastructure behind the invisible</span>
          <h1 id="hero-title">
            Secure.<br />Intelligent.<br /><span className="accent mark">Cinematic.</span>
          </h1>
          <div className="hero-rule" aria-hidden="true"><span /><ArrowUpRight size={14} /></div>
          <p className="lede">One studio for the layer people never see: the security that protects it, the systems that run it, and the story that sells it.</p>
          <div className="hero-actions">
            <Link href="/pricing" className="btn btn-dark">
              <span>Build your bucket</span><span className="arrow"><ArrowUpRight size={16} /></span>
            </Link>
            <a className="play" href={waLink("Hi R1VLE, I'd like a quick call about a project.")} target="_blank" rel="noopener noreferrer">
              <i><Play size={14} /></i> Talk on WhatsApp
            </a>
          </div>
        </div>

        <div className="hero-stage">
          <div className="halo" aria-hidden="true" />
          <div className="halo two" aria-hidden="true" />
          <svg className="orbit-lines" viewBox="0 0 600 600" aria-hidden="true">
            <path d="M80 140 C 200 90, 260 200, 300 300" />
            <path d="M540 230 C 460 210, 380 250, 300 300" />
            <path d="M90 470 C 190 470, 250 380, 300 300" />
            <path d="M520 500 C 430 480, 360 400, 300 300" />
          </svg>
          <div className="hero-canvas"><HeroVisual /></div>
          <div className="float-card fc-1"><span className="fc-ico"><Shield size={16} /></span><div><b>Pentest report</b><small>Delivered in 14 days</small></div></div>
          <div className="float-card fc-2"><span className="fc-ico lime"><Chip size={16} /></span><div><b>AI agent live</b><small>Answering on WhatsApp</small></div></div>
          <div className="float-card fc-3"><span className="fc-ico violet"><Pen size={16} /></span><div><b>12 flyers · 3 posters</b><small>Creative Studio this week</small></div></div>
          <div className="float-card fc-4"><MiniRing value={79} /><div><b>R1V-7KQ2 · 79%</b><small>Tracked live by the client</small></div></div>
          <div className="hero-counter" aria-hidden="true"><b>01</b><i />02<br />03</div>
        </div>
      </div>
      <div className="wrap">
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
