import { getBackend, readJson, requireOperator, requireSameOrigin, respond } from "@/server/backend";
import { parseOperatorDraft } from "@/server/validate";

export const dynamic = "force-dynamic";

/** Operator: send a bucket to a client as an offer they accept with one tap (starts "accepted"). */
export function POST(req: Request) {
  return respond(async () => {
    await requireOperator();
    await requireSameOrigin();
    const { input, agreedTotal, message } = parseOperatorDraft(await readJson(req));
    return (await getBackend()).quotes.createOffer({ client: input.client, items: input.items, region: input.region, note: input.brief }, { offerTotal: agreedTotal, message });
  }, 201);
}
