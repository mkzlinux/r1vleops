import Link from "next/link";
import "@/components/site/site.css";
import "@/components/client/client.css";
import { ClientOrders } from "@/components/client/ClientOrders";
import { ArrowLeft } from "@/components/Icons";
import { Brand, WhatsAppFab } from "@/components/site/SiteChrome";

export const metadata = { title: "Your orders", robots: { index: false, follow: false } };

export default function OrdersPage() {
  return (
    <main className="wrap">
      <div className="page-top"><Brand /><Link href="/" className="back"><ArrowLeft size={16} /> Home</Link></div>
      <span className="eyebrow">Your orders</span>
      <h1 className="page-title">Every invoice, <span className="accent mark">one place.</span></h1>
      <p className="page-sub">Invoices, receipts, payments and progress for everything you&rsquo;ve ordered from R1VLE. Tracking one project? <Link href="/track" className="ulink">Use its code</Link>.</p>
      <ClientOrders />
      <WhatsAppFab />
    </main>
  );
}
