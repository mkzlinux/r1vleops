import "@/components/site/site.css";
import "@/components/landing/landing.css";
import { Hero } from "@/components/landing/Hero";
import { AboutBento, Departments, IdeaBanner, Marquee, Process, ZiFarmChain } from "@/components/landing/Sections";
import { TrackCta } from "@/components/landing/TrackAndFooter";
import { SiteFooter, SiteNav, WhatsAppFab } from "@/components/site/SiteChrome";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Marquee />
        <AboutBento />
        <Departments />
        <ZiFarmChain />
        <Process />
        <IdeaBanner />
        <TrackCta />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
