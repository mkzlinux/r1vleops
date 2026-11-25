import "@/components/landing/landing.css";
import { Hero } from "@/components/landing/Hero";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";
import { Departments, Process, ZiFarmChain } from "@/components/landing/Sections";
import { Footer, TrackCta, WhatsAppFab } from "@/components/landing/TrackAndFooter";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Departments />
        <ZiFarmChain />
        <Process />
        <Pricing />
        <TrackCta />
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
