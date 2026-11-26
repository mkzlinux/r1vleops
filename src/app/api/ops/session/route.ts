import { requireOperator, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

export function GET() {
  return respond(async () => { await requireOperator(); return { ok: true }; });
}
