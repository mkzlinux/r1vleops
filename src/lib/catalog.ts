import type { Department, DepartmentId, Service } from "./types";

export const COMPANY = {
  name: "R1VLE",
  legalName: "R1VLE Holdings",
  tagline: "Infrastructure behind the invisible",
  email: "r1vle@pm.me",
  phoneDisplay: "+263 71 361 9305",
  depositPct: 50,
} as const;

export type PaymentMethodStatus = "live" | "soon" | "on-request";

export interface PaymentMethod {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly status: PaymentMethodStatus;
}

/** How clients will pay. Online checkout for these is planned; until then deposits are arranged on WhatsApp. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "paynow", label: "EcoCash · OneMoney · InnBucks · Cards", detail: "Local payments via Paynow", status: "live" },
  { id: "usdc", label: "USDC", detail: "BNB Smart Chain, Base, Arbitrum, Optimism, Polygon, Avalanche, Solana, Stellar, XRPL or Ethereum", status: "live" },
  { id: "paypal", label: "PayPal", detail: "International cards & PayPal", status: "soon" },
  { id: "bank", label: "Bank transfer", detail: "Details shared on WhatsApp", status: "on-request" },
];

export const PAYMENT_NOTE =
  "Pay online from this invoice page with Paynow (EcoCash, OneMoney, InnBucks, cards) or USDC. Payments are confirmed automatically.";

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
    priceUsd: 1482, unit: "fixed", deliveryDays: 7,
    regional: { zw: [{ minQty: 1, priceUsd: 344 }] },
    includes: ["Automated + manual testing", "Risk-ranked findings report", "Fix guidance call"],
  },
  {
    id: "sec-pentest", departmentId: "security", name: "Penetration Test",
    summary: "Scoped, authorised attack simulation against apps, APIs or network.",
    priceUsd: 2456, unit: "from", deliveryDays: 14,
    regional: { zw: [{ minQty: 1, priceUsd: 893 }] },
    includes: ["Rules of engagement", "Exploitation evidence", "Executive + technical report", "Free retest"],
  },
  {
    id: "sec-monitor", departmentId: "security", name: "Managed Monitoring",
    summary: "Ongoing threat monitoring, patch advisories and monthly posture report.",
    priceUsd: 484, unit: "monthly", deliveryDays: 3,
    regional: { zw: [{ minQty: 1, priceUsd: 241 }] },
    includes: ["Uptime + breach alerts", "Monthly report", "Priority incident line"],
  },
  {
    id: "int-site", departmentId: "intelligence", name: "Business Website",
    summary: "Fast, responsive marketing site with CMS and WhatsApp integration.",
    priceUsd: 1471, unit: "fixed", deliveryDays: 10,
    regional: { zw: [{ minQty: 1, priceUsd: 278 }] },
    includes: ["Up to 6 pages", "SEO basics", "Hosting setup", "1 month support"],
  },
  {
    id: "int-app", departmentId: "intelligence", name: "Web / Mobile App MVP",
    summary: "Product build from spec to launch: dashboard, auth, payments, data.",
    priceUsd: 7436, unit: "from", deliveryDays: 35,
    regional: { zw: [{ minQty: 1, priceUsd: 1486 }] },
    includes: ["Product scoping", "Design system", "Build + deploy", "Handover docs"],
  },
  {
    id: "int-fintech", departmentId: "intelligence", name: "Fintech & Blockchain Integration",
    summary: "Payment rails, wallets, smart contracts, stablecoin and ledger systems.",
    priceUsd: 11845, unit: "from", deliveryDays: 45,
    regional: { zw: [{ minQty: 1, priceUsd: 2452 }] },
    includes: ["Architecture review", "Smart contract / API build", "Security review", "Go-live support"],
  },
  {
    id: "int-ai", departmentId: "intelligence", name: "AI Agent & Automation",
    summary: "AI workers that answer clients, process documents or run workflows.",
    priceUsd: 2438, unit: "from", deliveryDays: 14,
    regional: { zw: [{ minQty: 1, priceUsd: 595 }] },
    includes: ["Workflow mapping", "Agent build", "WhatsApp / email channel", "Usage dashboard"],
  },
  {
    id: "cre-brand", departmentId: "creative", name: "Brand Identity",
    summary: "Logo system, palette, type and guidelines ready for every surface.",
    priceUsd: 1463, unit: "fixed", deliveryDays: 10,
    regional: { zw: [{ minQty: 1, priceUsd: 296 }] },
    includes: ["3 concepts", "Logo suite", "Brand guide PDF", "Social kit"],
  },
  {
    id: "cre-logo", departmentId: "creative", name: "Logo Design",
    summary: "A distinctive logo with variations for light, dark and small sizes.",
    priceUsd: 243, unit: "fixed", deliveryDays: 5,
    includes: ["2 concepts", "Colour + mono versions", "Source files"],
    regional: { zw: [{ minQty: 1, priceUsd: 20 }] },
  },
  {
    id: "cre-flyer", departmentId: "creative", name: "Flyer Design",
    summary: "Event, promo or product flyer, print-ready and social-ready.",
    priceUsd: 58, unit: "each", deliveryDays: 2,
    includes: ["Print PDF + PNG", "Instagram/WhatsApp sizes", "2 revisions"],
    regional: { zw: [{ minQty: 1, priceUsd: 20 }, { minQty: 2, priceUsd: 17 }] },
  },
  {
    id: "cre-poster", departmentId: "creative", name: "Poster Design",
    summary: "Large-format poster for events, launches or campaigns.",
    priceUsd: 76, unit: "each", deliveryDays: 3,
    regional: { zw: [{ minQty: 1, priceUsd: 45 }] },
    includes: ["A3/A2 print files", "Digital version", "2 revisions"],
  },
  {
    id: "cre-social", departmentId: "creative", name: "Social Media Post",
    summary: "Single branded post or carousel slide for any platform.",
    priceUsd: 34, unit: "each", deliveryDays: 1,
    regional: { zw: [{ minQty: 1, priceUsd: 15 }] },
    includes: ["Feed + story sizes", "Caption suggestion", "1 revision"],
  },
  {
    id: "cre-card", departmentId: "creative", name: "Business Card",
    summary: "Two-sided business card design, ready for the printer.",
    priceUsd: 46, unit: "each", deliveryDays: 2,
    regional: { zw: [{ minQty: 1, priceUsd: 25 }] },
    includes: ["Front + back", "Print-ready PDF", "QR code option"],
  },
  {
    id: "cre-brochure", departmentId: "creative", name: "Menu / Brochure",
    summary: "Multi-panel menu, brochure or company profile layout.",
    priceUsd: 145, unit: "each", deliveryDays: 4,
    regional: { zw: [{ minQty: 1, priceUsd: 70 }] },
    includes: ["Up to 4 panels", "Print + digital", "2 revisions"],
  },
  {
    id: "cre-banner", departmentId: "creative", name: "Banner / Billboard",
    summary: "Roll-up banner, billboard or shopfront signage artwork.",
    priceUsd: 118, unit: "each", deliveryDays: 3,
    regional: { zw: [{ minQty: 1, priceUsd: 60 }] },
    includes: ["Large-format files", "Mock-up preview", "2 revisions"],
  },
  {
    id: "cre-motion", departmentId: "creative", name: "Motion Graphics · 30s block",
    summary: "Animated explainer, product promo or logo reveal, priced per 30 seconds: a 60s video is 2 blocks, 90s is 3.",
    priceUsd: 584, unit: "each", per: "30s", deliveryDays: 7,
    regional: { zw: [{ minQty: 1, priceUsd: 248 }, { minQty: 2, priceUsd: 196 }], intl: [{ minQty: 1, priceUsd: 584 }, { minQty: 2, priceUsd: 432 }] },
    includes: ["Script + storyboard", "2 revision rounds", "Social cut-downs"],
  },
  {
    id: "cre-cinematic", departmentId: "creative", name: "Cinematic Production",
    summary: "3D or live-action cinematic for launches, real estate or campaigns.",
    priceUsd: 2465, unit: "from", deliveryDays: 21,
    regional: { zw: [{ minQty: 1, priceUsd: 691 }] },
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

/** Max quantity per bucket line: packs are one-offs, retainers are months, "each" items are pieces. */
export function maxQtyFor(service: Pick<Service, "unit" | "per">): number {
  if (service.unit === "each") return service.per ? 20 : 50;
  if (service.unit === "monthly") return 12;
  return 1;
}

export function serviceById(id: string, services: readonly Service[] = SERVICES): Service | undefined {
  return services.find((s) => s.id === id);
}
