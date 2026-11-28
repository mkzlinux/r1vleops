/** A legal document as data: rendered on the site, snapshotted into signed agreements, and hashed. */
export type LegalBlock = string | readonly string[];

export interface LegalSection {
  readonly heading: string;
  /** Paragraphs; an array is a bullet list. */
  readonly body: readonly LegalBlock[];
}

export type LegalDocId = "terms" | "privacy" | "nda" | "authorization";

export interface LegalDoc {
  readonly id: LegalDocId;
  readonly title: string;
  /** Bump when the wording changes; signed copies keep the version they were signed under. */
  readonly version: string;
  readonly effective: string;
  readonly summary: string;
  readonly intro: readonly string[];
  readonly sections: readonly LegalSection[];
}
