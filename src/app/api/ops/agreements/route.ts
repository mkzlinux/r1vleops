import { getBackend, requireOperator, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

/** Operator: every signed NDA, Authorization to Test and Terms acceptance, newest first. */
export function GET() {
  return respond(async () => { await requireOperator(); return (await getBackend()).agreements.list(); });
}
