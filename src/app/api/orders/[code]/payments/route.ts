import { getBackend, rateLimit, readJson, requireSameOrigin, respond } from "@/server/backend";
import { parseStartPayment } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: start paying an invoice's deposit or balance via Paynow or USDC. The amount comes from the invoice. */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("pay", { limit: 12, windowMs: 10 * 60 * 1000 });
    const { code } = await ctx.params;
    return (await getBackend()).payments.start(code, parseStartPayment(await readJson(req, 4000)));
  }, 201);
}
