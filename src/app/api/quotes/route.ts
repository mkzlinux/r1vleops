import { getBackend, rateLimit, readJson, requestLocation, requireSameOrigin, respond } from "@/server/backend";
import { toPublicQuote } from "@/server/quoteStore";
import { parseQuoteRequest } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: open a negotiation ticket for a bucket. Prices are recomputed on the server. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("quote", { limit: 6, windowMs: 60 * 60 * 1000 });
    const { region } = await requestLocation();
    return toPublicQuote(await (await getBackend()).quotes.create({ ...parseQuoteRequest(await readJson(req)), region }));
  }, 201);
}
