import { describe, expect, it } from "vitest";
import { checkPassword, createSessionToken, verifySessionToken } from "@/server/auth";

const SECRET = "test-secret-that-is-long-enough-123456";
const T0 = new Date("2026-11-26T10:00:00Z");

describe("ops auth", () => {
  it("accepts only the exact password", async () => {
    expect(await checkPassword("correct horse", "correct horse")).toBe(true);
    expect(await checkPassword("correct horse", "correct hors")).toBe(false);
    expect(await checkPassword("correct horse", "")).toBe(false);
  });

  it("refuses every password when none is configured", async () => {
    expect(await checkPassword("", "")).toBe(false);
  });

  it("issues a session token that verifies until it expires", async () => {
    const token = await createSessionToken(SECRET, T0);
    expect(await verifySessionToken(SECRET, token, new Date("2026-11-26T20:00:00Z"))).toBe(true);
    expect(await verifySessionToken(SECRET, token, new Date("2026-12-10T10:00:00Z"))).toBe(false);
  });

  it("rejects tampered tokens and tokens signed with another secret", async () => {
    const token = await createSessionToken(SECRET, T0);
    const [exp, sig] = token.split(".");
    expect(await verifySessionToken(SECRET, `${Number(exp) + 999999}.${sig}`, T0)).toBe(false);
    expect(await verifySessionToken("another-secret-that-is-long-enough!!", token, T0)).toBe(false);
    expect(await verifySessionToken(SECRET, "garbage", T0)).toBe(false);
    expect(await verifySessionToken(SECRET, undefined, T0)).toBe(false);
  });
});
