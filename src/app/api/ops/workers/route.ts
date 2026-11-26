import { getBackend, readJson, requireOperator, requireSameOrigin, respond } from "@/server/backend";
import { parseNewWorker } from "@/server/validate";

export const dynamic = "force-dynamic";

export function GET() {
  return respond(async () => { await requireOperator(); return (await getBackend()).store.listWorkers(); });
}

export function POST(req: Request) {
  return respond(async () => {
    await requireOperator();
    await requireSameOrigin();
    return (await getBackend()).store.hireWorker(parseNewWorker(await readJson(req)));
  }, 201);
}
