"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { describeFields, KIND_LABEL, type Agreement } from "@/lib/agreements";
import { COMPANY } from "@/lib/catalog";
import { apiCaller } from "@/lib/data/httpRepository";
import { LegalDocView } from "./LegalDocView";

const call = apiCaller();
type State = { status: "loading" } | { status: "found"; agreement: Agreement } | { status: "error"; message: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Harare" }) + " (Harare time)";

/** The signed copy: snapshot of the wording plus a signature certificate. Print it to save a PDF. */
export function SignedCopy({ code, isNew }: { code: string; isNew: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let isLive = true;
    call<Agreement>(`/api/agreements/${encodeURIComponent(code)}`)
      .then((agreement) => { if (isLive) setState({ status: "found", agreement }); })
      .catch((e: unknown) => { if (isLive) setState({ status: "error", message: e instanceof Error ? e.message : "Couldn't load this agreement." }); });
    return () => { isLive = false; };
  }, [code]);

  if (state.status === "loading") return <p className="empty">Loading signed copy…</p>;
  if (state.status === "error") return <p className="error-box" role="alert">{state.message}</p>;

  const a = state.agreement;
  const details = describeFields(a.kind, a.fields);
  return (
    <>
      {isNew && (
        <div className="signed-banner no-print" role="status">
          <b>Signed.</b> Save this page: bookmark it or print to PDF. The code <span className="mono">{a.code}</span> is the only way to open it.
          <button type="button" className="btn btn-dark" onClick={() => window.print()}>Print / save PDF</button>
        </div>
      )}
      <span className="eyebrow">{KIND_LABEL[a.kind]} · signed copy</span>
      <h1 className="page-title legal-title">{a.document.title}</h1>
      <LegalDocView doc={a.document} aside={!isNew && <button type="button" className="btn btn-dark toc-print" onClick={() => window.print()}>Print / save PDF</button>}>
        <section className="cert" aria-label="Signature certificate">
          <h2>Signature certificate</h2>
          <dl>
            {details.map((d) => <div key={d.label}><dt>{d.label}</dt><dd className="pre">{d.value}</dd></div>)}
            {a.refCode && <div><dt>Linked order</dt><dd className="mono"><Link href={`/track?code=${a.refCode}`}>{a.refCode}</Link></dd></div>}
          </dl>
          <div className="cert-parties">
            <div>
              <small>Signed by</small>
              <p className="sig">{a.signature}</p>
              <p>{a.signer.name}{a.signer.role && `, ${a.signer.role}`}{a.signer.company && ` · ${a.signer.company}`}<br />{a.signer.email}</p>
              <p className="mute">{when(a.signedAt)}{a.country && ` · from ${a.country}`}</p>
            </div>
            <div>
              <small>For {COMPANY.name}</small>
              <p className="sig">{COMPANY.name}</p>
              <p>Accepted electronically on signing<br />{COMPANY.email}</p>
            </div>
          </div>
          <p className="cert-hash">Agreement <span className="mono">{a.code}</span> · version <span className="mono">{a.version}</span> · document SHA-256 <span className="mono hash">{a.docHash}</span></p>
        </section>
      </LegalDocView>
    </>
  );
}
