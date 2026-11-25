import type { Department, DepartmentId, Service } from "./types";

export const COMPANY = {
  name: "R1VLE",
  legalName: "R1VLE Holdings",
  tagline: "Infrastructure behind the invisible",
  email: "r1vle@pm.me",
  phoneDisplay: "+263 71 361 9305",
  depositPct: 50,
  paymentOptions: [{ label: "Mobile Money (USD)", detail: "EcoCash USD / 0778 399 642" }],
} as const;

export const DEPARTMENTS: readonly Department[] = [
  {
    id: "security",
    name: "Security",
    tagline: "Cybersecurity that holds under pressure.",
    disciplines: ["Penetration testing", "Security audits", "Threat monitoring", "Incident response"],
    accent: "#ff4d3d",
  },
  {
    id: "intelligence",
    name: "Intelligence",
    tagline: "Fintech, software, blockchain and AI.",
    disciplines: ["Fintech systems", "Software development", "Blockchain", "Applied AI"],
    accent: "#c8f53b",
  },
  {
    id: "creative",
    name: "Creative Studio",
    tagline: "Graphics, motion and cinematics.",
    disciplines: ["Graphic design", "Motion graphics", "Cinematics", "Brand identity"],
    accent: "#7b8cff",
  },
];

/** Starter price list in USD. Edit freely; the ops dashboard can override prices. */
export const SERVICES: readonly Service[] = [
  {
    id: "sec-audit", departmentId: "security", name: "Web Security Audit",
    summary: "Configuration, auth and OWASP Top 10 review of one web app or site.",
    priceUsd: 350, unit: "fixed", deliveryDays: 7,
    includes: ["Automated + manual testing", "Risk-ranked findings report", "Fix guidance call"],
  },
  {
    id: "sec-pentest", departmentId: "security", name: "Penetration Test",
    summary: "Scoped, authorised attack simulation against apps, APIs or network.",
    priceUsd: 900, unit: "from", deliveryDays: 14,
    includes: ["Rules of engagement", "Exploitation evidence", "Executive + technical report", "Free retest"],
  },
  {
    id: "sec-monitor", departmentId: "security", name: "Managed Monitoring",
    summary: "Ongoing threat monitoring, patch advisories and monthly posture report.",
    priceUsd: 250, unit: "monthly", deliveryDays: 3,
    includes: ["Uptime + breach alerts", "Monthly report", "Priority incident line"],
  },
  {
    id: "int-site", departmentId: "intelligence", name: "Business Website",
    summary: "Fast, responsive marketing site with CMS and WhatsApp integration.",
    priceUsd: 280, unit: "fixed", deliveryDays: 10,
    includes: ["Up to 6 pages", "SEO basics", "Hosting setup", "1 month support"],
  },
  {
    id: "int-app", departmentId: "intelligence", name: "Web / Mobile App MVP",
    summary: "Product build from spec to launch: dashboard, auth, payments, data.",
    priceUsd: 1500, unit: "from", deliveryDays: 35,
    includes: ["Product scoping", "Design system", "Build + deploy", "Handover docs"],
  },
  {
    id: "int-fintech", departmentId: "intelligence", name: "Fintech & Blockchain Integration",
    summary: "Payment rails, wallets, smart contracts, stablecoin and ledger systems.",
    priceUsd: 2500, unit: "from", deliveryDays: 45,
    includes: ["Architecture review", "Smart contract / API build", "Security review", "Go-live support"],
  },
  {
    id: "int-ai", departmentId: "intelligence", name: "AI Agent & Automation",
    summary: "AI workers that answer clients, process documents or run workflows.",
    priceUsd: 600, unit: "from", deliveryDays: 14,
    includes: ["Workflow mapping", "Agent build", "WhatsApp / email channel", "Usage dashboard"],
  },
  {
    id: "cre-brand", departmentId: "creative", name: "Brand Identity",
    summary: "Logo system, palette, type and guidelines ready for every surface.",
    priceUsd: 300, unit: "fixed", deliveryDays: 10,
    includes: ["3 concepts", "Logo suite", "Brand guide PDF", "Social kit"],
  },
  {
    id: "cre-motion", departmentId: "creative", name: "Motion Graphics (30s)",
    summary: "Animated explainer, product promo or logo reveal up to 30 seconds.",
    priceUsd: 250, unit: "fixed", deliveryDays: 7,
    includes: ["Script + storyboard", "2 revision rounds", "Social cut-downs"],
  },
  {
    id: "cre-cinematic", departmentId: "creative", name: "Cinematic Production",
    summary: "3D or live-action cinematic for launches, real estate or campaigns.",
    priceUsd: 700, unit: "from", deliveryDays: 21,
    includes: ["Concept + previs", "3D / CGI render", "Colour grade + sound", "4K master"],
  },
];

export function departmentById(id: DepartmentId): Department {
  const found = DEPARTMENTS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown department: ${id}`);
  return found;
}

export function servicesFor(id: DepartmentId, services: readonly Service[] = SERVICES): Service[] {
  return services.filter((s) => s.departmentId === id);
}

export function serviceById(id: string, services: readonly Service[] = SERVICES): Service | undefined {
  return services.find((s) => s.id === id);
}
