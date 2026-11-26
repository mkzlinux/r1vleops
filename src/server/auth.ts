/** Single-operator auth for /ops: a password check plus an HMAC-signed, expiring session cookie. */
export const SESSION_COOKIE = "r1vle_ops";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Constant-time comparison of equal-length hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Compares digests (not raw strings) so timing leaks nothing about the password. Empty config never matches. */
export async function checkPassword(expected: string, given: string): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(expected)), crypto.subtle.digest("SHA-256", enc.encode(given))]);
  return safeEqual(toHex(a), toHex(b));
}

export async function createSessionToken(secret: string, now: Date): Promise<string> {
  const exp = String(now.getTime() + SESSION_TTL_MS);
  return `${exp}.${await hmac(secret, `ops:${exp}`)}`;
}

export async function verifySessionToken(secret: string, token: string | undefined, now: Date): Promise<boolean> {
  if (!secret || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now.getTime()) return false;
  return safeEqual(sig, await hmac(secret, `ops:${exp}`));
}
