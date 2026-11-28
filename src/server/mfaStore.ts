import { generateTotpSecret, otpauthUri, TOTP_PERIOD, verifyTotp } from "@/lib/totp";
import type { SqlClient } from "./sql";
import { StoreError } from "./sqlStore";

const RECOVERY_COUNT = 8;
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

interface Row { totp_secret: string | null; pending_secret: string | null; last_step: number; recovery: string; enabled_at: string | null }

/** Operator TOTP two-step sign-in. One operator ("owner"); secret encrypted with a key derived from the session secret. */
export function createMfaStore(sql: SqlClient, sessionSecret: string, now: () => Date = () => new Date()) {
  const keyPromise = crypto.subtle.digest("SHA-256", enc.encode(`r1vle-mfa:${sessionSecret}`))
    .then((raw) => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]));

  const seal = async (plain: string): Promise<string> => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyPromise, enc.encode(plain)));
    return `${b64(iv)}.${b64(ct)}`;
  };
  const open = async (sealed: string): Promise<string> => {
    const [iv, ct] = sealed.split(".");
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await keyPromise, unb64(ct)));
  };
  const hash = async (code: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(`r1vle-recovery:${code.trim().toLowerCase()}`)));

  const row = async (): Promise<Row | null> => (await sql.query<Row>("SELECT totp_secret, pending_secret, last_step, recovery, enabled_at FROM ops_security WHERE id = 'owner'"))[0] ?? null;
  const ensureRow = () => sql.query("INSERT OR IGNORE INTO ops_security (id) VALUES ('owner')");
  const seconds = () => Math.floor(now().getTime() / 1000);

  const newRecoveryCodes = async (): Promise<{ plain: string[]; hashes: string[] }> => {
    const plain = Array.from({ length: RECOVERY_COUNT }, () => {
      const r = crypto.getRandomValues(new Uint8Array(5));
      return [...r].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10).replace(/(.{5})/, "$1-");
    });
    return { plain, hashes: await Promise.all(plain.map(hash)) };
  };

  /** TOTP (with replay protection) or a one-time recovery code. */
  const consume = async (code: string): Promise<boolean> => {
    const r = await row();
    if (!r?.totp_secret) return false;
    const clean = code.trim();
    if (/^\d{6}$/.test(clean)) {
      const step = await verifyTotp(await open(r.totp_secret), clean, seconds());
      if (step === null || step <= r.last_step) return false;
      const updated = await sql.query<{ id: string }>("UPDATE ops_security SET last_step = ? WHERE id = 'owner' AND last_step < ? RETURNING id", [step, step]);
      return updated.length > 0;
    }
    const h = await hash(clean);
    const list = JSON.parse(r.recovery) as string[];
    if (!list.includes(h)) return false;
    await sql.query("UPDATE ops_security SET recovery = ? WHERE id = 'owner'", [JSON.stringify(list.filter((x) => x !== h))]);
    return true;
  };

  return {
    async isEnabled(): Promise<boolean> {
      return !!(await row())?.totp_secret;
    },

    async recoveryLeft(): Promise<number> {
      return (JSON.parse((await row())?.recovery ?? "[]") as string[]).length;
    },

    /** Starts enrollment: a fresh secret held as "pending" until confirmed with a code. */
    async beginSetup(): Promise<{ secret: string; uri: string }> {
      if (await this.isEnabled()) throw new StoreError("Two-step sign-in is already on.", 409);
      await ensureRow();
      const secret = generateTotpSecret();
      await sql.query("UPDATE ops_security SET pending_secret = ? WHERE id = 'owner'", [await seal(secret)]);
      return { secret, uri: otpauthUri(secret, "Founder", "R1VLE Ops") };
    },

    async confirmSetup(code: string): Promise<{ recoveryCodes: string[] }> {
      const r = await row();
      if (!r?.pending_secret) throw new StoreError("Start setup first.");
      const step = await verifyTotp(await open(r.pending_secret), code.trim(), seconds());
      if (step === null) throw new StoreError("That code didn't match. Check your phone's clock and try the newest code.");
      const { plain, hashes } = await newRecoveryCodes();
      await sql.query("UPDATE ops_security SET totp_secret = pending_secret, pending_secret = NULL, last_step = ?, recovery = ?, enabled_at = ? WHERE id = 'owner'",
        [step, JSON.stringify(hashes), now().toISOString()]);
      return { recoveryCodes: plain };
    },

    verifyLogin: consume,

    async regenerateRecovery(code: string): Promise<{ recoveryCodes: string[] }> {
      if (!(await consume(code))) throw new StoreError("That code didn't match.", 400);
      const { plain, hashes } = await newRecoveryCodes();
      await sql.query("UPDATE ops_security SET recovery = ? WHERE id = 'owner'", [JSON.stringify(hashes)]);
      return { recoveryCodes: plain };
    },

    async disable(code: string): Promise<void> {
      if (!(await consume(code))) throw new StoreError("That code didn't match.", 400);
      await sql.query("UPDATE ops_security SET totp_secret = NULL, pending_secret = NULL, last_step = 0, recovery = '[]', enabled_at = NULL WHERE id = 'owner'");
    },
  };
}

export type MfaStore = ReturnType<typeof createMfaStore>;
export const MFA_PERIOD = TOTP_PERIOD;
