import Link from "next/link";
import "@/components/site/site.css";
import "@/components/client/client.css";
import { CustomRequestForm } from "@/components/client/CustomRequestForm";
import { ArrowLeft } from "@/components/Icons";
import { Brand, WhatsAppFab } from "@/components/site/SiteChrome";

export const metadata = { title: "Request anything", description: "Need something that isn't on the price list? Describe it and R1VLE will reply with a price." };

export default function RequestPage() {
  return (
    <main className="wrap">
      <div className="page-top"><Brand /><Link href="/pricing" className="back"><ArrowLeft size={16} /> Pricing</Link></div>
      <span className="eyebrow">Custom request</span>
      <h1 className="page-title">Not on the list? <span className="accent mark">Ask anyway.</span></h1>
      <p className="page-sub">Security, software, fintech, AI or film: if it&apos;s within our three departments, describe it and we&apos;ll come back with a price.</p>
      <CustomRequestForm />
      <WhatsAppFab />
    </main>
  );
}
