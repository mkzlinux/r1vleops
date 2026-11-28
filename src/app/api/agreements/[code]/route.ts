import { getBackend, HttpError, rateLimit, respond } from "@/server/backend";
import { toPublicAgreement } from "@/server/agreementStore";

export const dynamic = "force-dynamic";

/** Public: a signed copy, reachable only with its private R1A- code. */
export function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    await rateLimit("agreement", { limit: 60, windowMs: 10 * 60 * 1000 });
    const { code } = await ctx.params;
    const found = await (await getBackend()).agreements.findByCode(code);
    if (!found) throw new HttpError(404, "No signed agreement matches that code.");
    return toPublicAgreement(found);
  });
}
