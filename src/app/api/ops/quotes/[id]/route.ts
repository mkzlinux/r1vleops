import { getBackend, readJson, requireOperator, requireSameOrigin, respond } from "@/server/backend";
import { parseQuoteResponse } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Operator: { action: "accept" | "decline", message } or { action: "counter", amount, message }. */
export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    await requireOperator();
    await requireSameOrigin();
    return (await getBackend()).quotes.respond((await ctx.params).id, parseQuoteResponse(await readJson(req, 8000)));
  });
}
