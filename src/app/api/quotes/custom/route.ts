import { getBackend, rateLimit, readJson, recordTermsAcceptance, requestLocation, requireSameOrigin, respond } from "@/server/backend";
import { toPublicQuote } from "@/server/quoteStore";
import { parseCustomRequest, requireTermsAccepted } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: ask for something that isn't on the price list. The operator replies with a price. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("custom", { limit: 5, windowMs: 60 * 60 * 1000 });
    const body = await readJson(req, 8000);
    requireTermsAccepted(body);
    const { region } = await requestLocation();
    const request = { ...parseCustomRequest(body), region };
    const quote = await (await getBackend()).quotes.createCustom(request);
    await recordTermsAcceptance(request.client, quote.code);
    return toPublicQuote(quote);
  }, 201);
}
