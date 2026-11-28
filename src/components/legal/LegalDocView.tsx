import type { ReactNode } from "react";
import type { LegalBlock, LegalDoc } from "@/lib/legal";

const slug = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  return <ul>{block.map((item) => <li key={item}>{item}</li>)}</ul>;
}

/** Shared reader for terms, privacy, NDA and authorization, live or from a signed snapshot. */
export function LegalDocView({ doc, aside, children }: { doc: LegalDoc; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="legal-grid">
      <nav className="legal-toc no-print" aria-label={`${doc.title} sections`}>
        <span className="eyebrow">Contents</span>
        <ol>{doc.sections.map((s) => <li key={s.heading}><a href={`#${slug(s.heading)}`}>{s.heading.replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
        {aside}
      </nav>
      <article className="legal-doc">
        <div className="legal-meta">
          <span>Version <b className="mono">{doc.version}</b></span>
          <span>Effective {doc.effective}</span>
        </div>
        <div className="legal-intro">{doc.intro.map((p) => <p key={p}>{p}</p>)}</div>
        {doc.sections.map((s) => (
          <section key={s.heading} id={slug(s.heading)} className="legal-sec">
            <h2>{s.heading}</h2>
            {s.body.map((b, i) => <Block key={i} block={b} />)}
          </section>
        ))}
        {children}
      </article>
    </div>
  );
}
