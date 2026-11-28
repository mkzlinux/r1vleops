import { getBackend, rateLimit, readJson, recordTermsAcceptance, requestLocation, requireSameOrigin, respond } from "@/server/backend";
import { parseNewOrder, requireTermsAccepted } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: place an order. Prices are always recomputed on the server. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("order", { limit: 8, windowMs: 60 * 60 * 1000 });
    const body = await readJson(req);
    requireTermsAccepted(body);
    const location = await requestLocation();
    const input = { ...parseNewOrder(body), region: location.region, country: location.country };
    const order = await (await getBackend()).store.createOrder(input);
    await recordTermsAcceptance(input.client, order.trackingCode);
    return order;
  }, 201);
}
