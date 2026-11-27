import { getBackend, readJson, requireOperator, requireSameOrigin, respond } from "@/server/backend";
import { parseOperatorDraft } from "@/server/validate";

export const dynamic = "force-dynamic";

export function GET() {
  return respond(async () => { await requireOperator(); return (await getBackend()).store.listOrders(); });
}

/** Operator: create an invoice from the dashboard (price list chosen by the operator; optional agreed total). */
export function POST(req: Request) {
  return respond(async () => {
    await requireOperator();
    await requireSameOrigin();
    const { input, agreedTotal } = parseOperatorDraft(await readJson(req));
    return (await getBackend()).store.createOrderAsOperator(input, agreedTotal);
  }, 201);
}
