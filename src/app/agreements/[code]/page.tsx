"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "@/components/site/site.css";
import "@/components/client/client.css";
import "@/components/legal/legal.css";
import { ArrowLeft } from "@/components/Icons";
import { SignedCopy } from "@/components/legal/SignedCopy";
import { Brand } from "@/components/site/SiteChrome";

function Loader() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  return <SignedCopy code={decodeURIComponent(params.code ?? "")} isNew={search.get("new") === "1"} />;
}

export default function AgreementPage() {
  return (
    <main className="wrap legal-page">
      <div className="page-top no-print"><Brand /><Link href="/legal" className="back"><ArrowLeft size={16} /> Legal</Link></div>
      <Suspense fallback={<p className="empty">Loading signed copy…</p>}><Loader /></Suspense>
    </main>
  );
}
