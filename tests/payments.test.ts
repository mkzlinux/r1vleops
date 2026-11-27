import { describe, expect, test } from "vitest";
import {
  USDC_CHAINS, amountDue, findEvmTransfer, findXrplPayment, isPaynowPaid, paynowHash, parseForm, payableKinds,
  pickUsdcUnits, toFormBody, unitsToUsd, verifyPaynowHash,
} from "@/lib/payments";
import type { Order } from "@/lib/types";

const order = (stage: Order["stage"]): Order => ({
  id: "o1", trackingCode: "R1V-AAAA-BBBB", invoiceNo: "R1VLE-INV-2026-001", createdAt: "2026-11-27T10:00:00Z", departmentId: "creative",
  client: { name: "A", company: "", email: "a@b.co", whatsapp: "+263771234567" }, brief: "",
  lines: [{ serviceId: "cre-flyer", name: "Flyer", qty: 3, rateUsd: 17 }], depositPct: 50, stage, progress: 0, assignedWorkerId: null, updates: [],
});

describe("what can be paid", () => {
  test("deposit while awaiting deposit, balance once work is in review or delivered", () => {
    expect(payableKinds(order("awaiting_deposit"))).toEqual(["deposit"]);
    expect(payableKinds(order("in_progress"))).toEqual([]);
    expect(payableKinds(order("delivered"))).toEqual(["balance"]);
    expect(payableKinds(order("closed"))).toEqual([]);
  });
  test("amounts come from the invoice", () => {
    expect(amountDue(order("awaiting_deposit"), "deposit")).toBe(25.5);
    expect(amountDue(order("delivered"), "balance")).toBe(25.5);
  });
});

describe("Paynow", () => {
  test("hash is SHA-512 over values in order plus the lowercased key, uppercase hex", async () => {
    const h = await paynowHash([["id", "1201"], ["reference", "TEST REF"], ["amount", "99.99"], ["status", "Message"]], "3E9FED89-60E1-4CE5-AB6E-6B1EB2D4F977");
    expect(h).toMatch(/^[0-9A-F]{128}$/);
    const again = await paynowHash([["id", "1201"], ["reference", "TEST REF"], ["amount", "99.99"], ["status", "Message"]], "3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977");
    expect(again).toBe(h);
  });
  test("verifies replies and rejects tampering", async () => {
    const key = "abc-key";
    const fields: [string, string][] = [["reference", "R1V-1"], ["amount", "25.50"], ["status", "Paid"], ["pollurl", "https://www.paynow.co.zw/Interface/CheckPayment/?guid=x"]];
    const body = toFormBody([...fields, ["hash", await paynowHash(fields, key)]]);
    const parsed = parseForm(body);
    expect(await verifyPaynowHash(parsed, key)).toBe(true);
    expect(parsed.find(([k]) => k === "pollurl")?.[1]).toContain("guid=x");
    const forged = parseForm(body.replace("25.50", "0.01"));
    expect(await verifyPaynowHash(forged, key)).toBe(false);
  });
  test("paid statuses", () => {
    expect(["Paid", "Awaiting Delivery", "Delivered"].every(isPaynowPaid)).toBe(true);
    expect(["Created", "Sent", "Cancelled", "Failed"].some(isPaynowPaid)).toBe(false);
  });
});

describe("USDC", () => {
  test("unique amount adds under one cent and avoids amounts already in use", () => {
    const units = pickUsdcUnits(25.5, new Set(), () => 0.5);
    expect(units).toBeGreaterThan(25_500_000n);
    expect(units).toBeLessThan(25_510_000n);
    const taken = new Set([units]);
    expect(pickUsdcUnits(25.5, taken, () => 0.5)).not.toBe(units);
    expect(unitsToUsd(25_504_321n)).toBe("25.504321");
  });

  test("matches an EVM Transfer log by token, recipient and exact value (BSC uses 18 decimals)", () => {
    const wallet = "0x1111111111111111111111111111111111111111";
    const topicTo = "0x000000000000000000000000" + wallet.slice(2);
    const bsc = USDC_CHAINS.bsc;
    const value = 25_504_321n * 10n ** 12n;
    const logs = [
      { address: bsc.token, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x" + "0".repeat(64), topicTo], data: "0x" + (value + 1n).toString(16), transactionHash: "0xbad" },
      { address: bsc.token.toLowerCase(), topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x" + "0".repeat(64), topicTo], data: "0x" + value.toString(16).padStart(64, "0"), transactionHash: "0xgood" },
    ];
    expect(findEvmTransfer(logs, { token: bsc.token, wallet, units: 25_504_321n, decimals: bsc.decimals })).toBe("0xgood");
    expect(findEvmTransfer(logs, { token: bsc.token, wallet, units: 1n, decimals: bsc.decimals })).toBeNull();
  });

  test("matches an XRPL USDC payment by destination tag and delivered amount", () => {
    const x = USDC_CHAINS.xrpl;
    const wallet = "rWALLET";
    const txs = [
      { tx: { TransactionType: "Payment", Destination: wallet, DestinationTag: 77, hash: "AAA" }, meta: { TransactionResult: "tesSUCCESS", delivered_amount: { currency: x.currency, issuer: x.issuer, value: "25.5" } }, validated: true },
      { tx: { TransactionType: "Payment", Destination: wallet, DestinationTag: 78, hash: "BBB" }, meta: { TransactionResult: "tesSUCCESS", delivered_amount: { currency: x.currency, issuer: "rFAKE", value: "100" } }, validated: true },
    ];
    expect(findXrplPayment(txs, { wallet, tag: 77, minUsd: 25.5 })).toBe("AAA");
    expect(findXrplPayment(txs, { wallet, tag: 77, minUsd: 30 })).toBeNull();
    expect(findXrplPayment(txs, { wallet, tag: 78, minUsd: 1 })).toBeNull();
  });
});
