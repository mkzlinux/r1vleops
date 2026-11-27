import { type FormFields, formValue, parseForm, paynowHash, toFormBody, verifyPaynowHash, type PaynowChannel } from "@/lib/payments";

const INITIATE_WEB = "https://www.paynow.co.zw/interface/initiatetransaction";
const INITIATE_MOBILE = "https://www.paynow.co.zw/interface/remotetransaction";
const PAYNOW_HOST = "www.paynow.co.zw";

export interface PaynowConfig { readonly integrationId: string; readonly integrationKey: string }
export interface PaynowStart {
  readonly reference: string; readonly amountUsd: number; readonly email: string; readonly info: string;
  readonly resultUrl: string; readonly returnUrl: string; readonly channel: PaynowChannel; readonly phone?: string;
}
export interface PaynowStarted { readonly pollUrl: string; readonly redirectUrl: string | null; readonly instructions: string | null }
export interface PaynowStatus { readonly status: string; readonly amount: string; readonly reference: string; readonly paynowReference: string }

export class PaynowError extends Error {}

/** Paynow Zimbabwe (EcoCash, OneMoney, InnBucks, cards). Mirrors the official SDK's request and hash format. */
export function paynowClient(cfg: PaynowConfig, fetcher: typeof fetch = fetch) {
  const post = async (url: string, body: string): Promise<[string, string][]> => {
    const res = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
    const fields = parseForm(await res.text());
    if (!res.ok) throw new PaynowError(`Paynow is unavailable (${res.status}).`);
    return fields;
  };

  const verified = async (fields: FormFields): Promise<FormFields> => {
    if (formValue(fields, "status")?.toLowerCase() === "error") throw new PaynowError(formValue(fields, "error") || "Paynow declined the request.");
    if (!(await verifyPaynowHash(fields, cfg.integrationKey))) throw new PaynowError("Paynow reply failed verification.");
    return fields;
  };

  return {
    async initiate(p: PaynowStart): Promise<PaynowStarted> {
      const isMobile = p.channel !== "web";
      const fields: [string, string][] = [
        ["resulturl", p.resultUrl], ["returnurl", p.returnUrl], ["reference", p.reference], ["amount", p.amountUsd.toFixed(2)],
        ["id", cfg.integrationId], ["additionalinfo", p.info], ["authemail", p.email],
        ...(isMobile ? ([["phone", p.phone ?? ""], ["method", p.channel]] as [string, string][]) : []),
        ["status", "Message"],
      ];
      fields.push(["hash", await paynowHash(fields, cfg.integrationKey)]);
      const reply = await verified(await post(isMobile ? INITIATE_MOBILE : INITIATE_WEB, toFormBody(fields)));
      const pollUrl = formValue(reply, "pollurl");
      if (!pollUrl || !isPaynowUrl(pollUrl)) throw new PaynowError("Paynow did not return a status link.");
      return { pollUrl, redirectUrl: formValue(reply, "browserurl") ?? null, instructions: formValue(reply, "instructions") ?? null };
    },

    async poll(pollUrl: string): Promise<PaynowStatus> {
      if (!isPaynowUrl(pollUrl)) throw new PaynowError("Unexpected Paynow status link.");
      return toStatus(await verified(await post(pollUrl, "")));
    },

    /** Validates Paynow's server-to-server status update (POSTed to our result URL). */
    async parseResult(body: string): Promise<PaynowStatus> {
      return toStatus(await verified(parseForm(body)));
    },
  };
}

const toStatus = (f: FormFields): PaynowStatus => ({
  status: formValue(f, "status") ?? "", amount: formValue(f, "amount") ?? "", reference: formValue(f, "reference") ?? "", paynowReference: formValue(f, "paynowreference") ?? "",
});

export const isPaynowUrl = (url: string): boolean => {
  try { const u = new URL(url); return u.protocol === "https:" && u.hostname === PAYNOW_HOST; } catch { return false; }
};

/** Paynow mobile money expects local format, e.g. 0771234567. */
export function toPaynowPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("263") ? `0${digits.slice(3)}` : digits;
  return /^07\d{8}$/.test(local) ? local : null;
}

export type PaynowClient = ReturnType<typeof paynowClient>;
