import { getBackend, rateLimit, readJson, requestLocation, requireSameOrigin, respond } from "@/server/backend";
import { parseNewOrder } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: place an order. Prices are always recomputed on the server. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("order", { limit: 8, windowMs: 60 * 60 * 1000 });
    const location = await requestLocation();
    const input = { ...parseNewOrder(await readJson(req)), region: location.region, country: location.country };
    return (await getBackend()).store.createOrder(input);
  }, 201);
}
