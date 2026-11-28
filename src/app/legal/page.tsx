import Link from "next/link";
import { ArrowUpRight } from "@/components/Icons";
import { LEGAL_DOCS, type LegalDocId } from "@/lib/legal";

export const metadata = { title: "Legal", description: "R1VLE Terms and Conditions, Privacy Policy, NDA and Authorization to Test." };

const CARDS: readonly { id: LegalDocId; tag: string; sign?: boolean }[] = [
  { id: "terms", tag: "Every project" },
  { id: "privacy", tag: "Your data" },
  { id: "nda", tag: "Sign online", sign: true },
  { id: "authorization", tag: "Security work · sign online", sign: true },
];

export default function LegalIndex() {
  return (
    <>
      <span className="eyebrow">Legal</span>
      <h1 className="page-title">The fine print, <span className="accent mark">in plain words.</span></h1>
      <p className="page-sub">What you agree to when you hire us, how we treat your data, and the two documents you can sign right here.</p>
      <div className="legal-cards">
        {CARDS.map((c, i) => {
          const doc = LEGAL_DOCS[c.id];
          return (
            <Link key={c.id} href={`/legal/${c.id}${c.sign ? "#sign" : ""}`} className={`legal-card${c.sign ? " is-sign" : ""}`}>
              <span className="lc-no mono">0{i + 1}</span>
              <span className="lc-tag">{c.tag}</span>
              <h2>{doc.title}</h2>
              <p>{doc.summary}</p>
              <span className="lc-go">{c.sign ? "Read & sign" : "Read"} <ArrowUpRight size={16} /></span>
            </Link>
          );
        })}
      </div>
      <p className="legal-note">Need a different NDA, your own paper, or a master services agreement? Send it to us; we review and sign reasonable client documents.</p>
    </>
  );
}
