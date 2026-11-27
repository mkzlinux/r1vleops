"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "@/components/site/site.css";
import "@/components/client/client.css";
import { ArrowLeft } from "@/components/Icons";
import { QuoteView } from "@/components/client/QuoteView";
import { Brand } from "@/components/site/SiteChrome";

function QuoteLoader() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = decodeURIComponent(params.code ?? "");
  return <QuoteView key={code} code={code} isNew={search.get("new") === "1"} />;
}

export default function QuotePage() {
  return (
    <main className="wrap">
      <div className="page-top"><Brand /><Link href="/pricing" className="back"><ArrowLeft size={16} /> Pricing</Link></div>
      <span className="eyebrow">Negotiation ticket</span>
      <Suspense fallback={<p className="empty">Loading…</p>}><QuoteLoader /></Suspense>
    </main>
  );
}
