"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizeTrackingCode } from "@/lib/orders";
import { ArrowUpRight } from "../Icons";

export function TrackCta() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = normalizeTrackingCode(code);
    if (clean) router.push(`/track?code=${encodeURIComponent(clean)}`);
  };
  return (
    <section className="section" id="track" aria-labelledby="track-title" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="track-card">
          <div>
            <span className="eyebrow">Already a client?</span>
            <h2 id="track-title">Track your project.</h2>
            <p>Use the code on your invoice, e.g. <span className="mono">R1V-7KQ2-9XAM</span>.</p>
          </div>
          <form className="track-form" onSubmit={submit}>
            <label htmlFor="track-code" className="sr-only">Tracking code</label>
            <input id="track-code" placeholder="R1V-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} />
            <button className="btn btn-dark" type="submit"><span className="label">Track</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
          </form>
        </div>
      </div>
    </section>
  );
}
