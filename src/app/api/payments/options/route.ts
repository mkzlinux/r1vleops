import { getBackend, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

/** Public: which online payment options are switched on. */
export function GET() {
  return respond(async () => (await getBackend()).payments.available());
}
