import { COMPANY } from "./catalog";
import { whatsappLink } from "./orders";

/** Public WhatsApp number used for negotiation and support. Digits only, with country code. */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "263713619305").replace(/\D/g, "");

export function waLink(message: string): string {
  return whatsappLink(WHATSAPP_NUMBER, message);
}

export const DEFAULT_WA_MESSAGE = `Hi ${COMPANY.name}, I'd like to talk about a project.`;
