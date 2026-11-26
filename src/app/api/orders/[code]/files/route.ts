import { getBackend, rateLimit, readJson, requireSameOrigin, respond } from "@/server/backend";
import { parseFileMetas } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: reserve slots for files on a just-placed order and hand back presigned R2 upload URLs. */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("files", { limit: 20, windowMs: 60 * 60 * 1000 });
    const { code } = await ctx.params;
    const { store, r2 } = await getBackend();
    const { added } = await store.reserveAttachments(code, parseFileMetas(await readJson(req)));
    return { uploads: await Promise.all(added.map(async (a) => ({ key: a.key, url: await r2.uploadUrl(a.key) }))) };
  });
}
