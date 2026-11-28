import { getBackend, rateLimit, readJson, requestLocation, requireSameOrigin, respond } from "@/server/backend";
import { toPublicQuote } from "@/server/quoteStore";
import { parseCustomRequest } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: ask for something that isn't on the price list. The operator replies with a price. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("custom", { limit: 5, windowMs: 60 * 60 * 1000 });
    const { region } = await requestLocation();
    return toPublicQuote(await (await getBackend()).quotes.createCustom({ ...parseCustomRequest(await readJson(req, 8000)), region }));
  }, 201);
}
