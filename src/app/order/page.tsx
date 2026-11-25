import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "@/components/landing/landing.css";
import "@/components/client/client.css";
import { ArrowLeft } from "@/components/Icons";
import { Brand } from "@/components/landing/Nav";
import { OrderForm } from "@/components/client/OrderForm";
import { WhatsAppFab } from "@/components/landing/TrackAndFooter";

export const metadata: Metadata = { title: "Start a project" };

export default function OrderPage() {
  return (
    <main className="wrap">
      <div className="page-top"><Brand /><Link href="/#pricing" className="back"><ArrowLeft size={16} /> Back to pricing</Link></div>
      <span className="eyebrow">New order</span>
      <h1 className="page-title">Start a project.</h1>
      <p className="page-sub">Pick your services and tell us about the work. You&rsquo;ll get an invoice and a private tracking code immediately. Work begins once the 50% deposit is confirmed.</p>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <OrderForm />
      </Suspense>
      <WhatsAppFab />
    </main>
  );
}
