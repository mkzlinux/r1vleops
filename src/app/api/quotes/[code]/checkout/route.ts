import { getBackend, rateLimit, requireSameOrigin, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

/** Public: take the agreed price and create the order (idempotent per ticket). */
export function POST(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("quotecheckout", { limit: 10, windowMs: 10 * 60 * 1000 });
    const order = await (await getBackend()).quotes.checkout((await ctx.params).code);
    return { ...order, client: { ...order.client, email: "", whatsapp: "" }, brief: "" };
  }, 201);
}
