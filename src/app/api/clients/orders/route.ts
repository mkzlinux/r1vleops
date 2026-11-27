import { HttpError, getBackend, rateLimit, readJson, requireSameOrigin, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

/** Public: a client's order history. Needs their email AND one of their tracking codes. */
export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("history", { limit: 15, windowMs: 10 * 60 * 1000 });
    const { email, code } = await readJson<{ email?: unknown; code?: unknown }>(req, 1000);
    if (typeof email !== "string" || typeof code !== "string" || email.length > 200 || code.length > 40) throw new HttpError(400, "Enter your email and a tracking code.");
    return (await getBackend()).store.findClientOrders(email, code);
  });
}
