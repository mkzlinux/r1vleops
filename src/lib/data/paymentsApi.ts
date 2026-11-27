import type { Payment, PaymentKind, PaynowChannel, UsdcChain } from "../payments";
import { apiCaller } from "./httpRepository";

export interface PaymentOptions { readonly paynow: boolean; readonly usdc: readonly UsdcChain[] }
export interface StartedPayment { readonly payment: Payment; readonly redirectUrl: string | null; readonly instructions: string | null }
export type StartPaymentInput =
  | { kind: PaymentKind; method: "paynow"; channel: PaynowChannel; phone?: string }
  | { kind: PaymentKind; method: "usdc"; channel: UsdcChain };

const call = apiCaller();
const enc = encodeURIComponent;

export const getPaymentOptions = () => call<PaymentOptions>("/api/payments/options");
export const startPayment = (code: string, input: StartPaymentInput) => call<StartedPayment>(`/api/orders/${enc(code)}/payments`, { method: "POST", body: input });
export const checkPayment = (code: string, id: string) => call<Payment>(`/api/orders/${enc(code)}/payments/${enc(id)}`);
