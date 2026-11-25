import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter-tight", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: "R1VLE · Infrastructure behind the invisible", template: "%s · R1VLE" },
  description: "R1VLE builds the invisible layer: cybersecurity, fintech & AI engineering, and cinematic creative. Order, pay 50% to start, and track your project live.",
  openGraph: { title: "R1VLE", description: "Security · Intelligence · Creative Studio", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0d0d0d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
