import { cookies } from "next/headers";
import { after } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_MS, checkPassword, createSessionToken } from "@/server/auth";
import { HttpError, clientIp, getBackend, rateLimit, readJson, requireSameOrigin, respond } from "@/server/backend";

export const dynamic = "force-dynamic";

const SITE_ORIGINS = ["https://r1vleops.vercel.app"];
const FAILURE_DELAY_MS = 800;

export function POST(req: Request) {
  return respond(async () => {
    await requireSameOrigin();
    await rateLimit("login", { limit: 8, windowMs: 15 * 60 * 1000 }); // a two-step sign-in uses 2 requests
    await rateLimit("login-day", { limit: 30, windowMs: 24 * 60 * 60 * 1000 });
    const secret = process.env.OPS_SESSION_SECRET ?? "";
    if (secret.length < 32) throw new HttpError(503, "Server is missing a session secret.");
    const { password, code } = await readJson<{ password?: unknown; code?: unknown }>(req, 2000);
    if (!(await checkPassword(process.env.OPS_PASSWORD ?? "", typeof password === "string" ? password : ""))) {
      console.warn("ops login failed", { ip: await clientIp() });
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS)); // slows scripted guessing
      throw new HttpError(401, "Wrong password.");
    }
    // Two-step sign-in: once enabled, the password alone never opens a session.
    const { mfa } = await getBackend();
    if (await mfa.isEnabled()) {
      if (typeof code !== "string" || code.trim() === "") throw new HttpError(401, "Enter the 6-digit code from your authenticator app.", { needsCode: true });
      if (!(await mfa.verifyLogin(code))) {
        console.warn("ops 2fa failed", { ip: await clientIp() });
        await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
        throw new HttpError(401, "That code didn't match. Use the newest code, or a recovery code.", { needsCode: true });
      }
    }
    (await cookies()).set(SESSION_COOKIE, await createSessionToken(secret, new Date()), {
      httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: SESSION_TTL_MS / 1000,
    });
    // After responding, let browsers on the site upload client files straight to R2 (idempotent).
    const origins = [...new Set([new URL(req.url).origin, ...SITE_ORIGINS])];
    after(async () => { await (await getBackend()).r2.allowBrowserUploads(origins).catch(() => false); });
    return { ok: true };
  });
}
