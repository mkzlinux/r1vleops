import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { SignForm } from "@/components/legal/SignForm";
import { isLegalDocId, LEGAL_DOC_IDS, LEGAL_DOCS } from "@/lib/legal";

export const dynamicParams = false;
export function generateStaticParams() {
  return LEGAL_DOC_IDS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalDocId(doc)) return {};
  return { title: LEGAL_DOCS[doc].title, description: LEGAL_DOCS[doc].summary };
}

export default async function LegalDocPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc: id } = await params;
  if (!isLegalDocId(id)) notFound();
  const doc = LEGAL_DOCS[id];
  const isSignable = id === "nda" || id === "authorization";
  return (
    <>
      <span className="eyebrow">Legal · {isSignable ? "sign online" : "R1VLE"}</span>
      <h1 className="page-title legal-title">{doc.title}</h1>
      <p className="page-sub">{doc.summary}</p>
      <LegalDocView doc={doc} aside={isSignable && <a href="#sign" className="btn btn-lime toc-print"><span>Sign online</span></a>}>
        {isSignable && <SignForm kind={id} />}
      </LegalDocView>
    </>
  );
}
