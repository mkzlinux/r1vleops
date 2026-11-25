import type { Metadata } from "next";
import "@/components/client/client.css";
import "@/components/ops/ops.css";
import { OpsGate } from "@/components/ops/OpsShell";

export const metadata: Metadata = { title: "Ops", robots: { index: false, follow: false } };

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return <OpsGate>{children}</OpsGate>;
}
