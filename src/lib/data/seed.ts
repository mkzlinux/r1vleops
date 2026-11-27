import { SERVICES } from "../catalog";
import { advanceOrder, buildOrder } from "../orders";
import type { Order, Worker } from "../types";

const JOINED = "2026-11-01T08:00:00.000Z";

/** The founder's five AI workers. */
export const SEED_WORKERS: readonly Worker[] = [
  { id: "ai-sentinel", kind: "ai", name: "SENTINEL", role: "Security analyst · audits & monitoring", departmentId: "security", email: "sentinel@r1vle.ai", status: "online", joinedAt: JOINED },
  { id: "ai-atlas", kind: "ai", name: "ATLAS", role: "Software & blockchain engineer", departmentId: "intelligence", email: "atlas@r1vle.ai", status: "busy", joinedAt: JOINED },
  { id: "ai-quant", kind: "ai", name: "QUANT", role: "Fintech & applied AI", departmentId: "intelligence", email: "quant@r1vle.ai", status: "idle", joinedAt: JOINED },
  { id: "ai-muse", kind: "ai", name: "MUSE", role: "Design, motion & cinematics", departmentId: "creative", email: "muse@r1vle.ai", status: "online", joinedAt: JOINED },
  { id: "ai-ledger", kind: "ai", name: "LEDGER", role: "Billing, client comms & ops", departmentId: "hq", email: "ledger@r1vle.ai", status: "online", joinedAt: JOINED },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** A few demo orders so the dashboard is not empty on first open. */
export function seedOrders(): Order[] {
  const random = seededRandom(42);
  const nos: string[] = [];
  const make = (serviceIds: readonly string[], name: string, company: string, day: number): Order => {
    const order = buildOrder(
      { client: { name, company, email: `${name.split(" ")[0].toLowerCase()}@example.com`, whatsapp: "+263770000000" }, brief: "Demo order", items: serviceIds.map((serviceId) => ({ serviceId, qty: 1 })), region: "zw" },
      { services: SERVICES, existingInvoiceNos: nos, now: new Date(Date.UTC(2026, 10, day)), random },
    );
    nos.push(order.invoiceNo);
    return order;
  };

  const audit = make(["sec-audit"], "Rudo Chikore", "Harvest Credit", 12);
  const app = make(["int-app"], "Farai Ndlovu", "Mbare Logistics", 15);
  const brand = make(["cre-brand", "cre-motion"], "Nyasha Moyo", "Kumusha Foods", 18);
  const ai = make(["int-ai"], "Tatenda Banda", "Sunrise Clinics", 22);

  return [
    { ...advanceOrder(advanceOrder(audit, { stage: "deposit_confirmed", progress: 5, note: "Deposit received." }, new Date(Date.UTC(2026, 10, 13))), { stage: "in_progress", progress: 60, note: "Manual testing of auth flows underway." }, new Date(Date.UTC(2026, 10, 20))), assignedWorkerId: "ai-sentinel" },
    { ...advanceOrder(advanceOrder(app, { stage: "deposit_confirmed", progress: 5, note: "Deposit received." }, new Date(Date.UTC(2026, 10, 16))), { stage: "in_progress", progress: 35, note: "Design system done, building dashboard." }, new Date(Date.UTC(2026, 10, 23))), assignedWorkerId: "ai-atlas" },
    { ...advanceOrder(advanceOrder(brand, { stage: "deposit_confirmed", progress: 5, note: "Deposit received." }, new Date(Date.UTC(2026, 10, 19))), { stage: "in_review", progress: 85, note: "Three logo concepts sent for review." }, new Date(Date.UTC(2026, 10, 24))), assignedWorkerId: "ai-muse" },
    ai,
  ];
}
