import { getBackend, rateLimit, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

/** Public: re-check a payment (Paynow status or on-chain) and return its state. */
export function GET(_req: Request, ctx: { params: Promise<{ code: string; id: string }> }) {
  return respond(async () => {
    await rateLimit("paycheck", { limit: 120, windowMs: 10 * 60 * 1000 });
    const { code, id } = await ctx.params;
    return (await getBackend()).payments.refresh(code, id);
  });
}
