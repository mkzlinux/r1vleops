import { priceBucket } from "@/lib/bucket";
import { clientKey } from "@/lib/opsStats";
import { normalizeTrackingCode } from "@/lib/orders";
import { buildQuote, canCheckoutQuote, discountLine, isValidQuoteCode, respondToQuote, type Quote, type QuoteRequest, type QuoteResponse, type QuoteStatus } from "@/lib/quotes";
import type { Order, Region } from "@/lib/types";
import type { SqlClient } from "./sql";
import { StoreError, type SqlStore } from "./sqlStore";

interface QuoteRow {
  id: string; code: string; created_at: string; client: string; client_email: string; region: Region; items: string; lines: string;
  list_total: number; proposed_total: number; note: string; status: QuoteStatus; offer_total: number | null; reply: string;
  responded_at: string | null; valid_until: string | null; order_code: string | null;
}

const toQuote = (r: QuoteRow): Quote => ({
  id: r.id, code: r.code, createdAt: r.created_at, client: JSON.parse(r.client), region: r.region, items: JSON.parse(r.items), lines: JSON.parse(r.lines),
  listTotal: Number(r.list_total), proposedTotal: Number(r.proposed_total), note: r.note, status: r.status,
  offerTotal: r.offer_total === null ? null : Number(r.offer_total), reply: r.reply, respondedAt: r.responded_at, validUntil: r.valid_until, orderCode: r.order_code,
});

/** What the public quote page may show: no contact details beyond the client's name. */
export const toPublicQuote = (q: Quote): Quote => ({ ...q, client: { name: q.client.name, company: q.client.company, email: "", whatsapp: "" } });

export function createQuoteStore(sql: SqlClient, orders: SqlStore, now: () => Date = () => new Date()) {
  const byCode = async (code: string): Promise<Quote | null> => {
    if (!isValidQuoteCode(code)) return null;
    const [row] = await sql.query<QuoteRow>("SELECT * FROM quotes WHERE code = ?", [normalizeTrackingCode(code)]);
    return row ? toQuote(row) : null;
  };

  const save = async (q: Quote): Promise<void> => {
    await sql.query("UPDATE quotes SET status = ?, offer_total = ?, reply = ?, responded_at = ?, valid_until = ?, order_code = ? WHERE id = ?",
      [q.status, q.offerTotal, q.reply, q.respondedAt, q.validUntil, q.orderCode, q.id]);
  };

  return {
    findByCode: byCode,

    async create(request: QuoteRequest): Promise<Quote> {
      let q: Quote;
      try {
        q = buildQuote(request, { services: await orders.listServices(), now: now(), random: Math.random });
      } catch (err: unknown) {
        throw new StoreError(err instanceof Error ? err.message : "Invalid request.");
      }
      await sql.query(
        "INSERT INTO quotes (id, code, created_at, client, client_email, region, items, lines, list_total, proposed_total, note, status, reply) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', '')",
        [q.id, q.code, q.createdAt, JSON.stringify(q.client), clientKey(q.client.email), q.region, JSON.stringify(q.items), JSON.stringify(q.lines), q.listTotal, q.proposedTotal, q.note],
      );
      return q;
    },

    async list(): Promise<Quote[]> {
      return (await sql.query<QuoteRow>("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 300")).map(toQuote);
    },

    async respond(id: string, response: QuoteResponse): Promise<Quote> {
      const [row] = await sql.query<QuoteRow>("SELECT * FROM quotes WHERE id = ?", [id]);
      if (!row) throw new StoreError("Ticket not found.", 404);
      let next: Quote;
      try { next = respondToQuote(toQuote(row), response, now()); } catch (err: unknown) { throw new StoreError(err instanceof Error ? err.message : "Invalid response."); }
      await save(next);
      return next;
    },

    /** Client accepts the offer: creates the order at the agreed price. Idempotent per quote. */
    async checkout(code: string): Promise<Order> {
      const q = await byCode(code);
      if (!q) throw new StoreError("Ticket not found.", 404);
      if (q.status === "converted" && q.orderCode) {
        const existing = await orders.findOrderByCode(q.orderCode, { includeContact: false });
        if (existing) return existing;
      }
      if (!canCheckoutQuote(q, now())) throw new StoreError(q.status === "open" ? "We haven't replied to this ticket yet." : "This offer is no longer available. Please open a new ticket.");
      const listNow = priceBucket(q.items, await orders.listServices(), q.region).total;
      const extra = discountLine(q, listNow);
      const order = await orders.createOrder({ client: q.client, brief: q.note ? `Negotiated (${q.code}): ${q.note}` : `Negotiated (${q.code})`, items: q.items, region: q.region }, extra ? [extra] : []);
      await save({ ...q, status: "converted", orderCode: order.trackingCode });
      return order;
    },
  };
}

export type QuoteStore = ReturnType<typeof createQuoteStore>;
