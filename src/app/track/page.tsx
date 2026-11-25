"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "@/components/landing/landing.css";
import "@/components/client/client.css";
import { ArrowLeft } from "@/components/Icons";
import { Brand } from "@/components/landing/Nav";
import { TrackView } from "@/components/client/TrackView";
import { WhatsAppFab } from "@/components/landing/TrackAndFooter";

function TrackFromUrl() {
  const code = useSearchParams().get("code");
  return <TrackView key={code ?? "none"} initialCode={code} />;
}

export default function TrackPage() {
  return (
    <main className="wrap">
      <div className="page-top"><Brand /><Link href="/" className="back"><ArrowLeft size={16} /> Home</Link></div>
      <span className="eyebrow">Project tracking</span>
      <h1 className="page-title">Where&rsquo;s my project?</h1>
      <p className="page-sub">Enter the tracking code from your invoice to see the live stage, progress and updates.</p>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <TrackFromUrl />
      </Suspense>
      <WhatsAppFab />
    </main>
  );
}
