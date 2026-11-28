import { getBackend, rateLimit, readJson, requireSameOrigin, respond, signingContext } from "@/server/backend";
import { toPublicAgreement } from "@/server/agreementStore";
import { parseSignRequest } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Public: sign an NDA or Authorization to Test. Returns the signed copy (without IP details). */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("sign", { limit: 10, windowMs: 60 * 60 * 1000 });
    const request = parseSignRequest(await readJson(req, 16_000));
    return toPublicAgreement(await (await getBackend()).agreements.sign(request, await signingContext()));
  }, 201);
}
