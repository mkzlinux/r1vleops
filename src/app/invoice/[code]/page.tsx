"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "@/components/site/site.css";
import "@/components/client/client.css";
import { ArrowLeft } from "@/components/Icons";
import { Brand } from "@/components/site/SiteChrome";
import { InvoiceView } from "@/components/client/InvoiceView";
import { useOrderByCode } from "@/components/client/useOrderByCode";

function InvoiceLoader() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = decodeURIComponent(params.code ?? "");
  const state = useOrderByCode(code);
  if (state.status === "found") return <InvoiceView order={state.order} isNew={search.get("new") === "1"} filesFailed={search.get("files") === "failed"} />;
  if (state.status === "error") return <p className="wrap error-box" role="alert">{state.message}</p>;
  if (state.status === "missing") return <p className="empty">No invoice matches code <span className="mono">{code}</span>.</p>;
  return <p className="empty">Loading invoice…</p>;
}

export default function InvoicePage() {
  return (
    <main>
      <div className="wrap page-top no-print"><Brand /><Link href="/" className="back"><ArrowLeft size={16} /> Home</Link></div>
      <Suspense fallback={<p className="empty">Loading invoice…</p>}>
        <InvoiceLoader />
      </Suspense>
    </main>
  );
}
