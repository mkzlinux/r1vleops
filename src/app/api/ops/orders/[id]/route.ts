import { getBackend, readJson, requireOperator, requireSameOrigin, respond } from "@/server/backend";
import { StoreError } from "@/server/sqlStore";
import { parseAdvance } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Operator: { action: "advance", stage, progress, note } or { action: "assign", workerId }. */
export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    await requireOperator();
    await requireSameOrigin();
    const { id } = await ctx.params;
    const body = await readJson<Record<string, unknown>>(req);
    const { store } = await getBackend();
    if (body.action === "advance") return store.advanceOrder(id, parseAdvance(body));
    if (body.action === "assign") {
      const workerId = body.workerId === null ? null : typeof body.workerId === "string" ? body.workerId : undefined;
      if (workerId === undefined) throw new StoreError("Invalid worker.");
      return store.assignWorker(id, workerId);
    }
    throw new StoreError("Unknown action.");
  });
}
