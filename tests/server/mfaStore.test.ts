import { describe, expect, test } from "vitest";
import { totp } from "@/lib/totp";
import { createMfaStore } from "@/server/mfaStore";
import { sqliteClient } from "./helpers";

const KEY = "session-secret-0123456789abcdef0123456789";

function setup() {
  const clock = { t: 1_800_000_000 };
  const store = createMfaStore(sqliteClient(), KEY, () => new Date(clock.t * 1000));
  return { store, clock };
}

describe("operator two-step sign-in", () => {
  test("setup → enable with a valid code → login needs a code", async () => {
    const { store, clock } = setup();
    expect(await store.isEnabled()).toBe(false);
    const { secret, uri } = await store.beginSetup();
    expect(uri).toMatch(/^otpauth:\/\/totp\/R1VLE%20Ops/);
    await expect(store.confirmSetup("000000")).rejects.toThrow(/code/i);
    const { recoveryCodes } = await store.confirmSetup(await totp(secret, clock.t));
    expect(recoveryCodes).toHaveLength(8);
    expect(await store.isEnabled()).toBe(true);
    await expect(store.beginSetup()).rejects.toThrow(/already/i);

    clock.t += 60;
    expect(await store.verifyLogin(await totp(secret, clock.t))).toBe(true);
  });

  test("a code can't be replayed and wrong codes fail", async () => {
    const { store, clock } = setup();
    const { secret } = await store.beginSetup();
    await store.confirmSetup(await totp(secret, clock.t));
    clock.t += 60;
    const code = await totp(secret, clock.t);
    expect(await store.verifyLogin(code)).toBe(true);
    expect(await store.verifyLogin(code)).toBe(false);
    expect(await store.verifyLogin("123456")).toBe(false);
  });

  test("recovery codes work once each; disabling needs a valid code", async () => {
    const { store, clock } = setup();
    const { secret } = await store.beginSetup();
    const { recoveryCodes } = await store.confirmSetup(await totp(secret, clock.t));
    expect(await store.verifyLogin(recoveryCodes[0])).toBe(true);
    expect(await store.verifyLogin(recoveryCodes[0])).toBe(false);
    expect(await store.recoveryLeft()).toBe(7);
    await expect(store.disable("000000")).rejects.toThrow(/code/i);
    await store.disable(recoveryCodes[1]);
    expect(await store.isEnabled()).toBe(false);
  });

  test("the secret is stored encrypted, not in plain text", async () => {
    const sql = sqliteClient();
    const store = createMfaStore(sql, KEY, () => new Date(1_800_000_000_000));
    const { secret } = await store.beginSetup();
    const [row] = await sql.query<{ pending_secret: string }>("SELECT pending_secret FROM ops_security");
    expect(row.pending_secret).not.toContain(secret);
  });
});
