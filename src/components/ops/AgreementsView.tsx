"use client";

import { useEffect, useState } from "react";
import { KIND_LABEL, type Agreement, type AgreementKind } from "@/lib/agreements";
import { isCloudflareBackend } from "@/lib/data";
import { apiCaller } from "@/lib/data/httpRepository";
import { OpsFrame, OpsSky } from "./OpsFrame";

const call = apiCaller();
type Row = Omit<Agreement, "document">;
type Tab = "signed" | AgreementKind;
const date = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Harare" });

/** Every NDA, Authorization to Test and Terms acceptance, with signing evidence. */
export function AgreementsView() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("signed");

  useEffect(() => {
    if (!isCloudflareBackend) return;
    call<Row[]>("/api/ops/agreements").then(setRows).catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load agreements."));
  }, []);

  const all = rows ?? [];
  const count = (k: AgreementKind) => all.filter((r) => r.kind === k).length;
  const list = all.filter((r) => (tab === "signed" ? r.kind !== "terms" : r.kind === tab));
  const tabs: readonly { id: Tab; label: string }[] = [
    { id: "signed", label: `Signed ${count("nda") + count("authorization")}` },
    { id: "nda", label: `NDAs ${count("nda")}` },
    { id: "authorization", label: `Authorizations ${count("authorization")}` },
    { id: "terms", label: `Terms accepted ${count("terms")}` },
  ];

  return (
    <OpsFrame active="agreements">
      <div className="room-grid">
        <section className="room-main">
          <OpsSky className="room-hero" accent="#8e9bff" strikeTarget={{ x: 0.8, y: 0.4 }}>
            <span className="ops-chip"><i />Agreements</span>
            <h1>{count("nda") + count("authorization")} signed</h1>
            <p>{error ?? "NDAs and testing authorisations clients signed online, plus every Terms acceptance from checkout. Never start a security test without a signed authorisation."}</p>
            <div className="room-kpis">
              <div><b>{count("nda")}</b><small>NDAs</small></div>
              <div><b>{count("authorization")}</b><small>Authorizations</small></div>
              <div><b>{count("terms")}</b><small>Terms accepted</small></div>
            </div>
          </OpsSky>
          <div className="room-panel">
            <div className="quick" style={{ marginBottom: 12 }}>
              <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/legal/nda#sign`).catch(() => undefined)}>Copy NDA link</button>
              <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/legal/authorization#sign`).catch(() => undefined)}>Copy authorization link</button>
            </div>
            <div className="g-tabs" role="tablist">
              {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="g-list" role="tabpanel">
              {!isCloudflareBackend ? <p className="g-empty">Agreements are stored on the live (Cloudflare) backend.</p>
                : rows === null && !error ? <p className="g-empty">Loading…</p>
                : list.length === 0 ? <p className="g-empty">Nothing here yet. Send clients the NDA or authorization link above.</p>
                : list.map((a) => (
                  <a key={a.id} className="g-row click" href={`/agreements/${a.code}`} target="_blank" rel="noopener noreferrer">
                    <span className={`stage-dot ${a.kind === "authorization" ? "in_progress" : a.kind === "nda" ? "deposit_confirmed" : "in_review"}`} />
                    <div className="g-grow">
                      <b>{a.signer.company || a.signer.name}<span className="cl-badge">{KIND_LABEL[a.kind]}</span></b>
                      <small>{a.signer.name}{a.signer.role && ` · ${a.signer.role}`} · {a.signer.email}{a.refCode && ` · ${a.refCode}`}</small>
                    </div>
                    <div className="g-row-end"><b>{date(a.signedAt)}</b><small className="mono">{a.ip || "?"}{a.country && ` · ${a.country}`} · v{a.version}</small></div>
                  </a>
                ))}
            </div>
          </div>
        </section>
      </div>
    </OpsFrame>
  );
}
