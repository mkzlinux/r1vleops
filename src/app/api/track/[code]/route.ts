import { getBackend, rateLimit, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

/** Public: look up an order by tracking code. Contact details and the brief are never returned. */
export function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    await rateLimit("track", { limit: 60, windowMs: 10 * 60 * 1000 });
    const { code } = await ctx.params;
    return (await getBackend()).store.findOrderByCode(code, { includeContact: false });
  });
}
