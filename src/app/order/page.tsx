import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "@/components/site/site.css";
import "@/components/client/client.css";
import { ArrowLeft } from "@/components/Icons";
import { SiteNav, WhatsAppFab } from "@/components/site/SiteChrome";
import { OrderForm } from "@/components/client/OrderForm";

export const metadata: Metadata = { title: "Start a project" };

export default function OrderPage() {
  return (
    <>
    <SiteNav />
    <main className="wrap">
      <div className="page-back"><Link href="/pricing" className="back"><ArrowLeft size={16} /> Back to bucket</Link></div>
      <span className="eyebrow">New order</span>
      <h1 className="page-title">Check <span className="accent mark">out.</span></h1>
      <p className="page-sub">Tell us who you are and send any files. You&rsquo;ll get an invoice and a private tracking code immediately. Work begins once the 50% deposit is confirmed.</p>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <OrderForm />
      </Suspense>
      <WhatsAppFab />
    </main>
    </>
  );
}
