import { HttpError, getBackend, rateLimit, readJson, requireOperator, requireSameOrigin, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

export function GET() {
  return respond(async () => {
    await requireOperator();
    const { mfa } = await getBackend();
    return { enabled: await mfa.isEnabled(), recoveryLeft: await mfa.recoveryLeft() };
  });
}

/** Operator: { action: "setup" } | { action: "confirm" | "recovery" | "disable", code }. */
export function POST(req: Request) {
  return respond(async () => {
    await requireOperator();
    await requireSameOrigin();
    await rateLimit("mfa", { limit: 10, windowMs: 10 * 60 * 1000 });
    const { action, code } = await readJson<{ action?: unknown; code?: unknown }>(req, 1000);
    const { mfa } = await getBackend();
    const c = typeof code === "string" ? code : "";
    if (action === "setup") return mfa.beginSetup();
    if (action === "confirm") return mfa.confirmSetup(c);
    if (action === "recovery") return mfa.regenerateRecovery(c);
    if (action === "disable") { await mfa.disable(c); return { ok: true }; }
    throw new HttpError(400, "Unknown action.");
  });
}
