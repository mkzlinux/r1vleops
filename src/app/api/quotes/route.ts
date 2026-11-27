import { getBackend, rateLimit, readJson, requireSameOrigin, respond } from "@/server/backend";
import { toPublicQuote } from "@/server/quoteStore";
import { parseQuoteRequest } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: open a negotiation ticket for a bucket. Prices are recomputed on the server. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("quote", { limit: 6, windowMs: 60 * 60 * 1000 });
    return toPublicQuote(await (await getBackend()).quotes.create(parseQuoteRequest(await readJson(req))));
  }, 201);
}
