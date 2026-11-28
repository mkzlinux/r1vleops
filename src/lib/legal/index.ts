import { AUTHORIZATION } from "./authorization";
import { NDA } from "./nda";
import { PRIVACY } from "./privacy";
import { TERMS } from "./terms";
import type { LegalDoc, LegalDocId } from "./types";

export type { LegalBlock, LegalDoc, LegalDocId, LegalSection } from "./types";
export { AUTHORIZATION, NDA, PRIVACY, TERMS };

export const LEGAL_DOCS: Readonly<Record<LegalDocId, LegalDoc>> = { terms: TERMS, privacy: PRIVACY, nda: NDA, authorization: AUTHORIZATION };
export const LEGAL_DOC_IDS = Object.keys(LEGAL_DOCS) as LegalDocId[];

export const isLegalDocId = (v: string): v is LegalDocId => (LEGAL_DOC_IDS as string[]).includes(v);
