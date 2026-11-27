import { getBackend, rateLimit, respond } from "@/server/backend";
import { toPublicQuote } from "@/server/quoteStore";

export const dynamic = "force-dynamic";

/** Public: a ticket's status (no contact details). */
export function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    await rateLimit("quoteread", { limit: 120, windowMs: 10 * 60 * 1000 });
    const q = await (await getBackend()).quotes.findByCode((await ctx.params).code);
    return q ? toPublicQuote(q) : null;
  });
}
