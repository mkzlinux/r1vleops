import type { Metadata } from "next";
import { Suspense } from "react";
import "@/components/site/site.css";
import "@/components/pricing/pricing.css";
import { PricingBuilder } from "@/components/pricing/PricingBuilder";
import { SiteFooter, SiteNav, WhatsAppFab } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Pricing · build your bucket", description: "Pick security, software and creative services, drop them in your bucket, negotiate or check out with a 50% deposit." };

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main className="wrap">
        <section className="price-hero">
          <div>
            <span className="chip"><span className="dot" />Pricing · USD</span>
            <h1>Build your <span className="accent mark">bucket.</span></h1>
          </div>
          <div>
            <p>Pick packages or single pieces, change quantities, then check out for an instant invoice, or open a negotiation ticket with your budget.</p>
            <div className="steps-mini"><span><b>01</b>Add</span><span><b>02</b>Negotiate or check out</span><span><b>03</b>Pay 50%, we start</span></div>
          </div>
        </section>
        <Suspense fallback={<p className="empty">Loading services…</p>}>
          <PricingBuilder />
        </Suspense>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
