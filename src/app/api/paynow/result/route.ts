import { getBackend, rateLimit } from "@/server/backend";

export const dynamic = "force-dynamic";

/** Paynow server-to-server status update. The hash is verified before anything changes. */
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 8000) return new Response("too large", { status: 413 });
  try {
    await rateLimit("paynow-result", { limit: 120, windowMs: 60_000 });
    await (await getBackend()).payments.handlePaynowResult(body);
    return new Response("ok");
  } catch (err: unknown) {
    console.error("Paynow result rejected", err instanceof Error ? err.message : err);
    return new Response("rejected", { status: 400 });
  }
}
