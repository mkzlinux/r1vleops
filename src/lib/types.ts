export type DepartmentId = "security" | "intelligence" | "creative";

export interface Department {
  readonly id: DepartmentId;
  readonly name: string;
  readonly tagline: string;
  readonly disciplines: readonly string[];
  readonly accent: string;
}

/** fixed/from: one per order · monthly: qty = months · each: qty = number of pieces (flyers, posters…) */
export type PriceUnit = "fixed" | "from" | "monthly" | "each";

/** Pricing region: Zimbabwe has local prices for some services; everyone else pays list price. */
export type Region = "zw" | "intl";

/** Volume tier: from `minQty` pieces upward, each costs `priceUsd`. */
export interface PriceTier {
  readonly minQty: number;
  readonly priceUsd: number;
}

export interface Service {
  readonly id: string;
  readonly departmentId: DepartmentId;
  readonly name: string;
  readonly summary: string;
  readonly priceUsd: number;
  readonly unit: PriceUnit;
  readonly deliveryDays: number;
  readonly includes: readonly string[];
  /** Optional per-region price tiers; regions without tiers use `priceUsd`. */
  readonly regional?: Partial<Record<Region, readonly PriceTier[]>>;
}

/** Ordered lifecycle of a client project. */
export const STAGES = [
  "awaiting_deposit",
  "deposit_confirmed",
  "in_progress",
  "in_review",
  "delivered",
  "closed",
] as const;
export type Stage = (typeof STAGES)[number];

export interface OrderLine {
  readonly serviceId: string;
  readonly name: string;
  readonly qty: number;
  readonly rateUsd: number;
}

export interface ProjectUpdate {
  readonly at: string;
  readonly stage: Stage;
  readonly progress: number;
  readonly note: string;
}

export interface Client {
  readonly name: string;
  readonly company: string;
  readonly email: string;
  readonly whatsapp: string;
}

/** A file the client attached to an order (logo, images, brief). Bytes live in file storage, not on the order. */
export interface Attachment {
  readonly key: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

export interface Order {
  readonly id: string;
  /** Public tracking code given to the client, e.g. R1V-7KQ2-9XAM */
  readonly trackingCode: string;
  readonly invoiceNo: string;
  readonly createdAt: string;
  readonly departmentId: DepartmentId;
  readonly client: Client;
  readonly brief: string;
  readonly lines: readonly OrderLine[];
  readonly depositPct: number;
  readonly stage: Stage;
  readonly progress: number;
  readonly assignedWorkerId: string | null;
  readonly updates: readonly ProjectUpdate[];
  /** Price list the order was quoted on (missing on older orders = international). */
  readonly region?: Region;
  readonly attachments?: readonly Attachment[];
}

export type WorkerKind = "ai" | "human";

export interface Worker {
  readonly id: string;
  readonly kind: WorkerKind;
  readonly name: string;
  readonly role: string;
  readonly departmentId: DepartmentId | "hq";
  readonly email: string;
  readonly status: "online" | "busy" | "idle" | "invited";
  readonly joinedAt: string;
}

export interface OrderItem {
  readonly serviceId: string;
  readonly qty: number;
}

export interface NewOrderInput {
  readonly client: Client;
  readonly brief: string;
  readonly items: readonly OrderItem[];
  readonly region: Region;
}

export interface NewWorkerInput {
  readonly name: string;
  readonly role: string;
  readonly departmentId: Worker["departmentId"];
  readonly email: string;
}
