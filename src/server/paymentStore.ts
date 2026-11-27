import type { Payment, PaymentKind, PaymentMethod, PaymentStatus, PaynowChannel, UsdcChain } from "@/lib/payments";
import type { SqlClient, SqlValue } from "./sql";

interface PaymentRow {
  id: string; order_id: string; kind: PaymentKind; method: PaymentMethod; channel: PaynowChannel | UsdcChain; amount_usd: number;
  status: PaymentStatus; created_at: string; paid_at: string | null; pay_amount: string | null; pay_units: string | null; pay_to: string | null;
  destination_tag: number | null; poll_url: string | null; scan_from: number | null; proof: string | null;
}

/** Server-side view of a payment, including fields never sent to browsers. */
export interface PaymentRecord extends Payment {
  readonly pollUrl: string | null;
  readonly scanFrom: number | null;
  readonly payUnits: bigint | null;
}

const toRecord = (r: PaymentRow): PaymentRecord => ({
  id: r.id, orderId: r.order_id, kind: r.kind, method: r.method, channel: r.channel, amountUsd: Number(r.amount_usd), status: r.status,
  createdAt: r.created_at, paidAt: r.paid_at, payAmount: r.pay_amount, payTo: r.pay_to, destinationTag: r.destination_tag, proof: r.proof,
  pollUrl: r.poll_url, scanFrom: r.scan_from, payUnits: r.pay_units ? BigInt(r.pay_units) : null,
});

/** Strips server-only fields. */
export const toPublicPayment = ({ pollUrl: _p, scanFrom: _s, payUnits: _u, ...pub }: PaymentRecord): Payment => pub;

export async function paymentsFor(sql: SqlClient, orderIds: readonly string[]): Promise<Map<string, Payment[]>> {
  const map = new Map<string, Payment[]>();
  if (orderIds.length === 0) return map;
  const rows = await sql.query<PaymentRow>(`SELECT * FROM payments WHERE order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY created_at`, orderIds);
  for (const r of rows) map.set(r.order_id, [...(map.get(r.order_id) ?? []), toPublicPayment(toRecord(r))]);
  return map;
}

export interface NewPayment {
  readonly orderId: string; readonly kind: PaymentKind; readonly method: PaymentMethod; readonly channel: PaynowChannel | UsdcChain; readonly amountUsd: number;
  readonly payAmount?: string; readonly payUnits?: bigint; readonly payTo?: string; readonly destinationTag?: number; readonly pollUrl?: string; readonly scanFrom?: number;
}

export function createPaymentStore(sql: SqlClient, now: () => Date) {
  const get = async (id: string): Promise<PaymentRecord | null> => {
    const [row] = await sql.query<PaymentRow>("SELECT * FROM payments WHERE id = ?", [id]);
    return row ? toRecord(row) : null;
  };

  return {
    get,

    async create(p: NewPayment): Promise<PaymentRecord> {
      const id = `pay_${now().getTime().toString(36)}${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
      const values: SqlValue[] = [id, p.orderId, p.kind, p.method, p.channel, p.amountUsd, now().toISOString(), p.payAmount ?? null,
        p.payUnits?.toString() ?? null, p.payTo ?? null, p.destinationTag ?? null, p.pollUrl ?? null, p.scanFrom ?? null];
      await sql.query("INSERT INTO payments (id, order_id, kind, method, channel, amount_usd, created_at, pay_amount, pay_units, pay_to, destination_tag, poll_url, scan_from) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", values);
      return (await get(id)) as PaymentRecord;
    },

    /** An open payment of the same kind and method that can be reused instead of creating another. */
    async findOpen(orderId: string, kind: PaymentKind, method: PaymentMethod, channel: string): Promise<PaymentRecord | null> {
      const [row] = await sql.query<PaymentRow>("SELECT * FROM payments WHERE order_id = ? AND kind = ? AND method = ? AND channel = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", [orderId, kind, method, channel]);
      return row ? toRecord(row) : null;
    },

    async openUsdcUnits(chain: UsdcChain): Promise<Set<bigint>> {
      const rows = await sql.query<{ pay_units: string }>("SELECT pay_units FROM payments WHERE method = 'usdc' AND channel = ? AND status = 'pending' AND pay_units IS NOT NULL", [chain]);
      return new Set(rows.map((r) => BigInt(r.pay_units)));
    },

    async nextDestinationTag(): Promise<number> {
      const [row] = await sql.query<{ n: number | null }>("SELECT MAX(destination_tag) AS n FROM payments");
      return Math.max(Number(row?.n ?? 0), 100_000) + 1;
    },

    async setPollUrl(id: string, pollUrl: string): Promise<void> { await sql.query("UPDATE payments SET poll_url = ? WHERE id = ?", [pollUrl, id]); },
    async setScanFrom(id: string, block: number): Promise<void> { await sql.query("UPDATE payments SET scan_from = ? WHERE id = ? AND status = 'pending'", [block, id]); },

    /** Moves a pending payment to a final state. Returns true only for the call that made the change (idempotent). */
    async settle(id: string, status: Exclude<PaymentStatus, "pending">, proof: string | null): Promise<boolean> {
      // A transaction or Paynow reference can only ever pay for one payment.
      const rows = await sql.query<{ id: string }>(
        "UPDATE payments SET status = ?, proof = COALESCE(?, proof), paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END WHERE id = ? AND status = 'pending' AND (? IS NULL OR NOT EXISTS (SELECT 1 FROM payments p2 WHERE p2.proof = ? AND p2.status = 'paid' AND p2.id <> ?)) RETURNING id",
        [status, proof, status, now().toISOString(), id, proof, proof, id]);
      return rows.length > 0;
    },
  };
}

export type PaymentStore = ReturnType<typeof createPaymentStore>;
