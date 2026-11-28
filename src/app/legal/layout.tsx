import Link from "next/link";
import "@/components/site/site.css";
import "@/components/client/client.css";
import "@/components/legal/legal.css";
import { ArrowLeft } from "@/components/Icons";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="wrap legal-page">
        <div className="page-back no-print"><Link href="/legal" className="back"><ArrowLeft size={16} /> Legal</Link></div>
        {children}
      </main>
      <div className="no-print"><SiteFooter /></div>
    </>
  );
}
