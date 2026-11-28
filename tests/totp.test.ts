import { describe, expect, test } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, otpauthUri, totp, verifyTotp } from "@/lib/totp";

// RFC 6238 Appendix B (SHA-1 seed "12345678901234567890"), 8-digit codes.
const SEED = base32Encode(new TextEncoder().encode("12345678901234567890"));

describe("TOTP (RFC 6238)", () => {
  test("matches the RFC test vectors", async () => {
    expect(await totp(SEED, 59, { digits: 8 })).toBe("94287082");
    expect(await totp(SEED, 1111111109, { digits: 8 })).toBe("07081804");
    expect(await totp(SEED, 1234567890, { digits: 8 })).toBe("89005924");
    expect(await totp(SEED, 2000000000, { digits: 8 })).toBe("69279037");
  });

  test("base32 round-trips and secrets are 160-bit", () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(s))).toBe(s);
  });

  test("accepts the current code and one step either side, returns the matched step", async () => {
    const s = generateTotpSecret();
    const t = 1_800_000_000;
    const code = await totp(s, t);
    expect(await verifyTotp(s, code, t)).toBe(Math.floor(t / 30));
    expect(await verifyTotp(s, code, t + 30)).toBe(Math.floor(t / 30));
    expect(await verifyTotp(s, code, t + 90)).toBeNull();
    expect(await verifyTotp(s, "12345", t)).toBeNull();
    expect(await verifyTotp(s, "abcdef", t)).toBeNull();
  });

  test("otpauth URI for authenticator apps", () => {
    expect(otpauthUri("JBSWY3DPEHPK3PXP", "Founder", "R1VLE Ops")).toBe("otpauth://totp/R1VLE%20Ops:Founder?secret=JBSWY3DPEHPK3PXP&issuer=R1VLE%20Ops&algorithm=SHA1&digits=6&period=30");
  });
});
