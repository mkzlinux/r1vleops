import { getBackend, respond } from "@/server/backend";
import { hitRateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Background payment sweep, called every couple of minutes by a Cloudflare scheduled Worker.
 * Safe to expose: it only re-checks pending payments (amounts and proofs are verified as usual),
 * and a global rate limit stops it being used to hammer the payment networks.
 */
export function GET() {
  return respond(async () => {
    const { sql } = await getBackend();
    if (!(await hitRateLimit(sql, "cron:payments", { limit: 3, windowMs: 60_000 }))) return { skipped: true };
    return (await getBackend()).payments.checkPending({ limit: 40, budgetMs: 22_000 });
  });
}
