"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { DEPARTMENTS } from "@/lib/catalog";
import { readClientMemory, rememberClient } from "@/lib/clientMemory";
import { getRepository } from "@/lib/data";
import { validateCustomRequest } from "@/lib/quotes";
import type { Client, DepartmentId } from "@/lib/types";
import { ArrowUpRight } from "../Icons";
import { TERMS_REQUIRED, TermsCheckbox } from "../legal/TermsCheckbox";

const EMPTY: Client = { name: "", company: "", email: "", whatsapp: "" };

/** "Something that isn't on the list": opens a custom ticket we price and reply to. */
export function CustomRequestForm() {
  const router = useRouter();
  const [client, setClient] = useState<Client>(EMPTY);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<DepartmentId>("intelligence");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => { const c = readClientMemory().client; if (c) setClient(c); }, []);
  const set = (k: keyof Client) => (v: string) => setClient((c) => ({ ...c, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const request = { client, title, description, departmentId, budget: budget.trim() === "" ? null : Number(budget), timeline, region: "intl" as const, acceptTerms };
    const problems = [...validateCustomRequest(request), ...(acceptTerms ? [] : [TERMS_REQUIRED])];
    setErrors(problems);
    if (problems.length > 0) return;
    setIsBusy(true);
    try {
      const q = await getRepository().createCustomRequest(request);
      rememberClient(client);
      router.push(`/quote/${q.code}?new=1`);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Couldn't send your request. Please try again."]);
      setIsBusy(false);
    }
  };

  return (
    <form className="cr-form" onSubmit={submit} noValidate>
      <section className="panel">
        <h2>1 · What do you need?</h2>
        <div className="cr-depts" role="radiogroup" aria-label="Closest department">
          {DEPARTMENTS.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={departmentId === d.id} className={departmentId === d.id ? "on" : ""} onClick={() => setDepartmentId(d.id)}>
              <b>{d.name}</b><small>{d.tagline}</small>
            </button>
          ))}
        </div>
        <div className="field"><label htmlFor="cr-title">Title</label><input id="cr-title" className="input" maxLength={120} placeholder="e.g. Red-team exercise, POS integration, launch film" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="field"><label htmlFor="cr-desc">Describe it</label><textarea id="cr-desc" className="input" maxLength={4000} placeholder="Goals, scope, what success looks like, anything we should know." value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="cr-budget">Budget in USD <small>(optional)</small></label><input id="cr-budget" className="input" type="number" inputMode="decimal" min={1} placeholder="Leave empty for a quote" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
          <div className="field"><label htmlFor="cr-time">Timeline <small>(optional)</small></label><input id="cr-time" className="input" maxLength={120} placeholder="e.g. by March, 6 weeks" value={timeline} onChange={(e) => setTimeline(e.target.value)} /></div>
        </div>
      </section>
      <section className="panel">
        <h2>2 · Who are we talking to?</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="cr-name">Full name</label><input id="cr-name" className="input" autoComplete="name" value={client.name} onChange={(e) => set("name")(e.target.value)} required /></div>
          <div className="field"><label htmlFor="cr-co">Company <small>(optional)</small></label><input id="cr-co" className="input" autoComplete="organization" value={client.company} onChange={(e) => set("company")(e.target.value)} /></div>
          <div className="field"><label htmlFor="cr-email">Email</label><input id="cr-email" className="input" type="email" inputMode="email" autoComplete="email" value={client.email} onChange={(e) => set("email")(e.target.value)} required /></div>
          <div className="field"><label htmlFor="cr-wa">WhatsApp</label><input id="cr-wa" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+263 77 123 4567" value={client.whatsapp} onChange={(e) => set("whatsapp")(e.target.value)} required /></div>
        </div>
      </section>
      <TermsCheckbox id="cr-terms" checked={acceptTerms} onChange={setAcceptTerms} />
      {errors.length > 0 && <div className="error-box" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
      <button className="btn btn-dark cr-submit" type="submit" disabled={isBusy}><span>{isBusy ? "Sending…" : "Send request"}</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
      <p className="hint">You&apos;ll get a private ticket page. We reply with a price there and on WhatsApp; accepting it creates your invoice.</p>
    </form>
  );
}
