import { describe, expect, test } from "vitest";
import { memoryBlobStore } from "@/lib/data/localRepository";
import { USDC_CHAINS, parseForm, paynowHash, toFormBody } from "@/lib/payments";
import { createPaymentService } from "@/server/paymentService";
import { createPaymentStore } from "@/server/paymentStore";
import { paynowClient } from "@/server/paynow";
import { createSqlStore } from "@/server/sqlStore";
import { sqliteClient } from "./helpers";

const KEY = "integration-key-123";
const client = { name: "Rudo M", company: "", email: "rudo@example.com", whatsapp: "+263 77 123 4567" };
const T0 = new Date("2026-11-27T10:00:00Z");
const WALLETS = { base: "0x1111111111111111111111111111111111111111", bsc: "0x2222222222222222222222222222222222222222", xrpl: "rWALLETxxxxxxxxxxxxxxxxxxxxxxxx" };

async function signed(fields: [string, string][]): Promise<string> {
  return toFormBody([...fields, ["hash", await paynowHash(fields, KEY)]]);
}

function setup(opts: { paynowStatus?: string; logs?: unknown[]; xrplTxs?: unknown[]; clock?: { t: Date }; testEmail?: string } = {}) {
  const clock = opts.clock ?? { t: T0 };
  const now = () => clock.t;
  const sql = sqliteClient();
  const store = createSqlStore(sql, { now, blobs: memoryBlobStore() });
  const sent: { url: string; body: string }[] = [];
  let head = 0x1000;
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const body = String(init?.body ?? "");
    sent.push({ url, body });
    if (url.includes("paynow.co.zw/interface/")) {
      return new Response(await signed([["status", "Ok"], ["instructions", "Approve on your phone"], ["pollurl", "https://www.paynow.co.zw/Interface/CheckPayment/?guid=abc"], ["paynowreference", "PN1"]]));
    }
    if (url.includes("CheckPayment")) {
      const ref = sent.find((s) => s.url.includes("/interface/"))!.body;
      const reference = parseForm(ref).find(([k]) => k === "reference")![1];
      const amount = parseForm(ref).find(([k]) => k === "amount")![1];
      return new Response(await signed([["reference", reference], ["paynowreference", "PN1"], ["amount", amount], ["status", opts.paynowStatus ?? "Sent"], ["pollurl", url]]));
    }
    const req = JSON.parse(body);
    if (req.method === "eth_blockNumber") { head += 50; return Response.json({ result: `0x${head.toString(16)}` }); }
    if (req.method === "eth_getLogs") return Response.json({ result: opts.logs ?? [] });
    if (req.method === "account_tx") return Response.json({ result: { status: "success", transactions: opts.xrplTxs ?? [] } });
    return new Response("?", { status: 404 });
  }) as unknown as typeof fetch;
  const service = createPaymentService({
    store, payments: createPaymentStore(sql, now), now, siteUrl: "https://r1vle.test",
    paynow: paynowClient({ integrationId: "1201", integrationKey: KEY }, fakeFetch),
    paynowTestEmail: opts.testEmail ?? null,
    wallets: WALLETS, rpc: { base: "https://rpc.base.test", bsc: "https://rpc.bsc.test", xrpl: "https://rpc.xrpl.test" }, fetcher: fakeFetch,
  });
  return { store, service, sent, clock };
}

const placeOrder = (store: ReturnType<typeof createSqlStore>) =>
  store.createOrder({ client, brief: "", items: [{ serviceId: "cre-flyer", qty: 3 }], region: "zw" }); // $51 → deposit $25.50

describe("payment service", () => {
  test("reports what is available", () => {
    expect(setup().service.available()).toEqual({ paynow: true, paynowTest: false, usdc: ["base", "bsc", "xrpl"] });
  });

  test("EcoCash: pushes to the client's phone with the invoice amount and a signed request", async () => {
    const { store, service, sent } = setup();
    const order = await placeOrder(store);
    const res = await service.start(order.trackingCode, { kind: "deposit", method: "paynow", channel: "ecocash", phone: "+263 77 123 4567" });
    expect(res.instructions).toBe("Approve on your phone");
    const req = parseForm(sent[0].body);
    expect(sent[0].url).toBe("https://www.paynow.co.zw/interface/remotetransaction");
    expect(Object.fromEntries(req)).toMatchObject({ amount: "25.50", phone: "0771234567", method: "ecocash", id: "1201", resulturl: "https://r1vle.test/api/paynow/result" });
    expect(req.at(-1)![1]).toBe(await paynowHash(req, KEY));
    expect(res.payment.status).toBe("pending");
  });

  test("Paynow 'Paid' confirms the deposit and advances the order exactly once", async () => {
    const { store, service } = setup({ paynowStatus: "Paid" });
    const order = await placeOrder(store);
    const { payment } = await service.start(order.trackingCode, { kind: "deposit", method: "paynow", channel: "ecocash", phone: "0771234567" });
    const p = await service.refresh(order.trackingCode, payment.id);
    expect(p.status).toBe("paid");
    await service.refresh(order.trackingCode, payment.id);
    const after = await store.findOrderByCode(order.trackingCode, { includeContact: true });
    expect(after?.stage).toBe("deposit_confirmed");
    expect(after?.updates.filter((u) => u.stage === "deposit_confirmed")).toHaveLength(1);
    expect(after?.payments?.[0].proof).toBe("PN1");
  });

  test("the Paynow result webhook is verified before anything changes", async () => {
    const { store, service } = setup();
    const order = await placeOrder(store);
    const { payment } = await service.start(order.trackingCode, { kind: "deposit", method: "paynow", channel: "web" });
    await expect(service.handlePaynowResult("reference=" + payment.id + "&status=Paid&hash=FORGED")).rejects.toThrow();
    await service.handlePaynowResult(await signed([["reference", payment.id], ["paynowreference", "PN9"], ["amount", "25.50"], ["status", "Paid"], ["pollurl", "https://www.paynow.co.zw/x"]]));
    expect((await store.findOrderByCode(order.trackingCode, { includeContact: false }))?.stage).toBe("deposit_confirmed");
  });

  test("a Paynow payment for less than the amount due is not accepted", async () => {
    const { store, service } = setup();
    const order = await placeOrder(store);
    const { payment } = await service.start(order.trackingCode, { kind: "deposit", method: "paynow", channel: "web" });
    await service.handlePaynowResult(await signed([["reference", payment.id], ["paynowreference", "PN9"], ["amount", "1.00"], ["status", "Paid"], ["pollurl", "https://www.paynow.co.zw/x"]]));
    expect((await store.findOrderByCode(order.trackingCode, { includeContact: false }))?.stage).toBe("awaiting_deposit");
  });

  test("rejects payments the invoice does not allow and bad phone numbers", async () => {
    const { store, service } = setup();
    const order = await placeOrder(store);
    await expect(service.start(order.trackingCode, { kind: "balance", method: "paynow", channel: "web" })).rejects.toThrow(/nothing|not due/i);
    await expect(service.start(order.trackingCode, { kind: "deposit", method: "paynow", channel: "ecocash", phone: "+44 7700 900123" })).rejects.toThrow(/phone/i);
  });

  test("USDC on BSC: unique amount, reused on refresh, confirmed by an exact 18-decimal transfer", async () => {
    const logs: unknown[] = [];
    const { store, service } = setup({ logs });
    const order = await placeOrder(store);
    const { payment } = await service.start(order.trackingCode, { kind: "deposit", method: "usdc", channel: "bsc" });
    expect(payment.payTo).toBe(WALLETS.bsc);
    expect(payment.payAmount).toMatch(/^25\.50\d{4}$/);
    const again = await service.start(order.trackingCode, { kind: "deposit", method: "usdc", channel: "bsc" });
    expect(again.payment.id).toBe(payment.id);
    expect((await service.refresh(order.trackingCode, payment.id)).status).toBe("pending");

    const units = BigInt(payment.payAmount!.replace(".", ""));
    logs.push({ address: USDC_CHAINS.bsc.token, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x" + "0".repeat(64), "0x" + "0".repeat(24) + WALLETS.bsc.slice(2)], data: "0x" + (units * 10n ** 12n).toString(16), transactionHash: "0xabc" });
    const paid = await service.refresh(order.trackingCode, payment.id);
    expect(paid.status).toBe("paid");
    expect(paid.proof).toBe("0xabc");
  });

  test("USDC on XRPL uses a destination tag", async () => {
    const txs: unknown[] = [];
    const { store, service } = setup({ xrplTxs: txs });
    const order = await placeOrder(store);
    const { payment } = await service.start(order.trackingCode, { kind: "deposit", method: "usdc", channel: "xrpl" });
    expect(payment.destinationTag).toBeGreaterThan(100000);
    txs.push({ validated: true, tx: { TransactionType: "Payment", Destination: WALLETS.xrpl, DestinationTag: payment.destinationTag, hash: "XRPHASH" }, meta: { TransactionResult: "tesSUCCESS", delivered_amount: { currency: USDC_CHAINS.xrpl.currency, issuer: USDC_CHAINS.xrpl.issuer, value: "25.5" } } });
    expect((await service.refresh(order.trackingCode, payment.id)).status).toBe("paid");
  });

  test("balance payment closes the order once delivered", async () => {
    const { store, service } = setup({ paynowStatus: "Paid" });
    const order = await placeOrder(store);
    await store.advanceOrder(order.id, { stage: "delivered", progress: 100, note: "Delivered" });
    const { payment } = await service.start(order.trackingCode, { kind: "balance", method: "paynow", channel: "web" });
    await service.refresh(order.trackingCode, payment.id);
    expect((await store.findOrderByCode(order.trackingCode, { includeContact: false }))?.stage).toBe("closed");
  });

  test("unpaid payments expire after 24 hours", async () => {
    const clock = { t: T0 };
    const { store, service } = setup({ clock });
    const order = await placeOrder(store);
    const { payment } = await service.start(order.trackingCode, { kind: "deposit", method: "usdc", channel: "base" });
    clock.t = new Date(T0.getTime() + 25 * 3600_000);
    expect((await service.refresh(order.trackingCode, payment.id)).status).toBe("expired");
  });

  test("a payment can only be read with its own order's code", async () => {
    const { store, service } = setup();
    const a = await placeOrder(store);
    const b = await placeOrder(store);
    const { payment } = await service.start(a.trackingCode, { kind: "deposit", method: "usdc", channel: "base" });
    await expect(service.refresh(b.trackingCode, payment.id)).rejects.toThrow(/not found/i);
  });

  test("one blockchain transaction cannot pay two invoices", async () => {
    const logs: unknown[] = [];
    const { store, service } = setup({ logs });
    const a = await placeOrder(store);
    const b = await placeOrder(store);
    const pa = (await service.start(a.trackingCode, { kind: "deposit", method: "usdc", channel: "base" })).payment;
    const pb = (await service.start(b.trackingCode, { kind: "deposit", method: "usdc", channel: "base" })).payment;
    const topic = "0x" + "0".repeat(24) + WALLETS.base.slice(2);
    const T = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    // A malicious RPC returning the same tx hash for both amounts must not settle both.
    logs.push({ address: USDC_CHAINS.base.token, topics: [T, "0x" + "0".repeat(64), topic], data: "0x" + BigInt(pa.payAmount!.replace(".", "")).toString(16), transactionHash: "0xsame" });
    logs.push({ address: USDC_CHAINS.base.token, topics: [T, "0x" + "0".repeat(64), topic], data: "0x" + BigInt(pb.payAmount!.replace(".", "")).toString(16), transactionHash: "0xsame" });
    expect((await service.refresh(a.trackingCode, pa.id)).status).toBe("paid");
    expect((await service.refresh(b.trackingCode, pb.id)).status).toBe("pending");
  });

  test("Paynow test mode sends the merchant's email instead of the client's", async () => {
    const { store, service, sent } = setup({ testEmail: "merchant@example.com" });
    expect(service.available().paynowTest).toBe(true);
    const order = await placeOrder(store);
    await service.start(order.trackingCode, { kind: "deposit", method: "paynow", channel: "ecocash", phone: "0771111111" });
    expect(Object.fromEntries(parseForm(sent[0].body)).authemail).toBe("merchant@example.com");
  });
});
