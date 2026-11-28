import { getBackend, rateLimit, readJson, recordTermsAcceptance, requestLocation, requireSameOrigin, respond } from "@/server/backend";
import { toPublicQuote } from "@/server/quoteStore";
import { parseQuoteRequest, requireTermsAccepted } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: open a negotiation ticket for a bucket. Prices are recomputed on the server. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("quote", { limit: 6, windowMs: 60 * 60 * 1000 });
    const body = await readJson(req);
    requireTermsAccepted(body);
    const { region } = await requestLocation();
    const request = { ...parseQuoteRequest(body), region };
    const quote = await (await getBackend()).quotes.create(request);
    await recordTermsAcceptance(request.client, quote.code);
    return toPublicQuote(quote);
  }, 201);
}
