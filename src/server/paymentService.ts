import {
  USDC_CHAINS, USDC_CHAIN_IDS, amountDue, isEvmChain, usesTag, isPaynowFailed, isPaynowPaid, payableKinds, pickUsdcUnits, unitsToUsd,
  type Payment, type PaymentKind, type PaynowChannel, type UsdcChain,
} from "@/lib/payments";
import { formatUsd } from "@/lib/orders";
import type { Order } from "@/lib/types";
import { DEFAULT_RPC, evmChecker, solanaChecker, stellarChecker, xrplChecker } from "./chains";
import { createPaymentStore, toPublicPayment, type PaymentRecord, type PaymentStore } from "./paymentStore";
import { toPaynowPhone, type PaynowClient } from "./paynow";
import { StoreError, type SqlStore } from "./sqlStore";

const PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;
const SOLANA_LOOKBACK_S = 120;
const CHANNEL_LABEL: Record<string, string> = {
  ecocash: "EcoCash", onemoney: "OneMoney", innbucks: "InnBucks", web: "Paynow",
  ...Object.fromEntries(USDC_CHAIN_IDS.map((c) => [c, `USDC on ${USDC_CHAINS[c].label}`])),
};

export type StartPayment =
  | { readonly kind: PaymentKind; readonly method: "paynow"; readonly channel: PaynowChannel; readonly phone?: string }
  | { readonly kind: PaymentKind; readonly method: "usdc"; readonly channel: UsdcChain };

export interface StartedPayment { readonly payment: Payment; readonly redirectUrl: string | null; readonly instructions: string | null }

export interface PaymentServiceDeps {
  readonly store: SqlStore;
  readonly payments?: PaymentStore;
  readonly now?: () => Date;
  readonly siteUrl: string;
  readonly paynow: PaynowClient | null;
  /** Paynow test mode: requests use the merchant's own email (Paynow requires it) and the UI says "test". */
  readonly paynowTestEmail?: string | null;
  readonly wallets: Partial<Record<UsdcChain, string>>;
  readonly rpc?: Partial<Record<UsdcChain, string>>;
  readonly fetcher?: typeof fetch;
}

/** Starts and confirms invoice payments. Prices always come from the stored order, never from the browser. */
export function createPaymentService(deps: PaymentServiceDeps) {
  const now = deps.now ?? (() => new Date());
  const payments = deps.payments ?? createPaymentStore(deps.store.sql, now);
  const fetcher = deps.fetcher ?? fetch;
  const usdcChains = USDC_CHAIN_IDS.filter((c) => !!deps.wallets[c]);
  const rpcUrls: Record<UsdcChain, string> = { ...DEFAULT_RPC, ...Object.fromEntries(Object.entries(deps.rpc ?? {}).filter(([, v]) => !!v)) };

  const orderFor = async (code: string): Promise<Order> => {
    const order = await deps.store.findOrderByCode(code, { includeContact: true });
    if (!order) throw new StoreError("Order not found.", 404);
    return order;
  };

  /** Applies a confirmed payment to the order (deposit → work starts, balance → closed). Runs once per payment. */
  const settlePaid = async (p: PaymentRecord, proof: string): Promise<void> => {
    if (!(await payments.settle(p.id, "paid", proof))) return;
    const order = await deps.store.findOrderByCode((await orderById(p.orderId)).trackingCode, { includeContact: true });
    if (!order) return;
    const note = `${p.kind === "deposit" ? "Deposit" : "Balance"} of ${formatUsd(p.amountUsd)} received via ${CHANNEL_LABEL[p.channel] ?? p.channel} (ref ${proof.slice(0, 24)}).`;
    if (p.kind === "deposit" && order.stage === "awaiting_deposit") {
      await deps.store.advanceOrder(order.id, { stage: "deposit_confirmed", progress: Math.max(order.progress, 5), note });
    } else if (p.kind === "balance" && order.stage !== "closed") {
      await deps.store.advanceOrder(order.id, { stage: "closed", progress: 100, note });
    }
  };

  const orderById = async (id: string): Promise<{ trackingCode: string }> => {
    const [row] = await deps.store.sql.query<{ tracking_code: string }>("SELECT tracking_code FROM orders WHERE id = ?", [id]);
    if (!row) throw new StoreError("Order not found.", 404);
    return { trackingCode: row.tracking_code };
  };

  /** Looks for the payment on its network; returns the transaction id once found. */
  const findOnChain = async (chain: UsdcChain, wallet: string, p: PaymentRecord): Promise<string | null> => {
    if (chain === "xrpl") return xrplChecker(rpcUrls.xrpl, fetcher).find(wallet, p.destinationTag ?? -1, p.amountUsd);
    if (chain === "stellar") return stellarChecker(rpcUrls.stellar, fetcher).find(wallet, String(p.destinationTag ?? ""), p.amountUsd);
    if (p.payUnits === null || p.scanFrom === null) return null;
    if (chain === "solana") return solanaChecker(rpcUrls.solana, fetcher).find(wallet, p.payUnits, p.scanFrom);
    const res = await evmChecker(chain, rpcUrls[chain], fetcher).scan(wallet, p.payUnits, p.scanFrom);
    if (!res.txHash) await payments.setScanFrom(p.id, res.nextFrom);
    return res.txHash;
  };

  const isExpired = (p: PaymentRecord) => now().getTime() - new Date(p.createdAt).getTime() > PAYMENT_TTL_MS;

  /** Checks Paynow or the blockchain for one pending payment and settles it if final. */
  const check = async (p: PaymentRecord): Promise<void> => {
    if (p.status !== "pending") return;
    if (p.method === "paynow") {
      if (!deps.paynow || !p.pollUrl) return;
      const s = await deps.paynow.poll(p.pollUrl);
      if (isPaynowPaid(s.status) && Number(s.amount) + 1e-9 >= p.amountUsd) return settlePaid(p, s.paynowReference || p.id);
      if (isPaynowFailed(s.status)) { await payments.settle(p.id, "failed", null); return; }
    } else {
      const chain = p.channel as UsdcChain;
      const wallet = deps.wallets[chain];
      if (!wallet) return;
      const proof = await findOnChain(chain, wallet, p);
      if (proof) return settlePaid(p, proof);
    }
    if (isExpired(p)) await payments.settle(p.id, "expired", null);
  };

  return {
    available: () => ({ paynow: !!deps.paynow, paynowTest: !!deps.paynow && !!deps.paynowTestEmail, usdc: usdcChains }),

    async start(code: string, input: StartPayment): Promise<StartedPayment> {
      const order = await orderFor(code);
      if (!payableKinds(order).includes(input.kind)) throw new StoreError(`The ${input.kind} on this invoice is not due right now.`);
      const amountUsd = amountDue(order, input.kind);
      if (amountUsd <= 0) throw new StoreError("There is nothing to pay on this invoice.");

      if (input.method === "paynow") {
        if (!deps.paynow) throw new StoreError("Paynow payments are not available yet.");
        const phone = input.channel === "web" ? undefined : toPaynowPhone(input.phone ?? "");
        if (input.channel !== "web" && !phone) throw new StoreError("Enter the Zimbabwean phone number to charge, e.g. 0771234567.");
        const p = await payments.create({ orderId: order.id, kind: input.kind, method: "paynow", channel: input.channel, amountUsd });
        try {
          const started = await deps.paynow.initiate({
            reference: p.id, amountUsd, email: deps.paynowTestEmail || order.client.email, info: `${order.invoiceNo}-${input.kind}`, channel: input.channel, phone: phone ?? undefined,
            resultUrl: `${deps.siteUrl}/api/paynow/result`, returnUrl: `${deps.siteUrl}/invoice/${order.trackingCode}?payment=${p.id}`,
          });
          await payments.setPollUrl(p.id, started.pollUrl);
          return { payment: toPublicPayment(p), redirectUrl: started.redirectUrl, instructions: started.instructions };
        } catch (err: unknown) {
          await payments.settle(p.id, "failed", null);
          throw new StoreError(err instanceof Error ? err.message : "Paynow could not start the payment.");
        }
      }

      const chain = input.channel;
      const wallet = deps.wallets[chain];
      if (!wallet || !USDC_CHAINS[chain]) throw new StoreError("That USDC network is not available.");
      const open = await payments.findOpen(order.id, input.kind, "usdc", chain);
      if (open && !isExpired(open) && open.amountUsd === amountUsd) return { payment: toPublicPayment(open), redirectUrl: null, instructions: null };

      if (usesTag(chain)) {
        const p = await payments.create({ orderId: order.id, kind: input.kind, method: "usdc", channel: chain, amountUsd, payAmount: amountUsd.toFixed(2), payTo: wallet, destinationTag: await payments.nextDestinationTag() });
        return { payment: toPublicPayment(p), redirectUrl: null, instructions: null };
      }
      const units = pickUsdcUnits(amountUsd, await payments.openUsdcUnits(chain));
      // EVM: block to scan from. Solana: unix time to look back to.
      const scanFrom = isEvmChain(chain)
        ? await evmChecker(chain, rpcUrls[chain], fetcher).startBlock()
        : Math.floor(now().getTime() / 1000) - SOLANA_LOOKBACK_S;
      const p = await payments.create({ orderId: order.id, kind: input.kind, method: "usdc", channel: chain, amountUsd, payAmount: unitsToUsd(units), payUnits: units, payTo: wallet, scanFrom });
      return { payment: toPublicPayment(p), redirectUrl: null, instructions: null };
    },

    /** Re-checks a payment (client polling or ops refresh) and returns its current state. */
    async refresh(code: string, paymentId: string): Promise<Payment> {
      const order = await orderFor(code);
      const p = await payments.get(paymentId);
      if (!p || p.orderId !== order.id) throw new StoreError("Payment not found.", 404);
      await check(p);
      return toPublicPayment((await payments.get(paymentId)) as PaymentRecord);
    },

    /** Paynow server-to-server status update. Throws if the hash does not verify. */
    async handlePaynowResult(body: string): Promise<void> {
      if (!deps.paynow) throw new StoreError("Paynow is not configured.");
      const s = await deps.paynow.parseResult(body);
      const p = await payments.get(s.reference);
      if (!p || p.method !== "paynow" || p.status !== "pending") return;
      if (isPaynowPaid(s.status) && Number(s.amount) + 1e-9 >= p.amountUsd) await settlePaid(p, s.paynowReference || p.id);
      else if (isPaynowFailed(s.status)) await payments.settle(p.id, "failed", null);
    },
  };
}

export type PaymentService = ReturnType<typeof createPaymentService>;
