import { getBackend, readJson, requireOperator, requireSameOrigin, respond } from "@/server/backend";
import { StoreError } from "@/server/sqlStore";

export const dynamic = "force-dynamic";

export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    await requireOperator();
    await requireSameOrigin();
    const { id } = await ctx.params;
    const { priceUsd } = await readJson<{ priceUsd?: unknown }>(req);
    if (typeof priceUsd !== "number") throw new StoreError("Price must be a number.");
    return (await getBackend()).store.updateServicePrice(id, priceUsd);
  });
}
