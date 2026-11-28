"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { TEST_TECHNIQUES, validateSignRequest, type Agreement, type SignRequest, type SignableKind, type Signer, type TechniqueId } from "@/lib/agreements";
import { readClientMemory } from "@/lib/clientMemory";
import { apiCaller } from "@/lib/data/httpRepository";
import { ArrowUpRight } from "../Icons";

const call = apiCaller();
const EMPTY_SIGNER: Signer = { name: "", email: "", company: "", role: "" };
const today = () => new Date().toISOString().slice(0, 10);

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}{hint && <small> {hint}</small>}</label>{children}</div>;
}

/** Sign an NDA or Authorization to Test online: typed-name signature, stored with the exact wording. */
export function SignForm({ kind }: { kind: SignableKind }) {
  const router = useRouter();
  const [signer, setSigner] = useState<Signer>(EMPTY_SIGNER);
  const [purpose, setPurpose] = useState("");
  const [inScope, setInScope] = useState("");
  const [outOfScope, setOutOfScope] = useState("");
  const [windowStart, setWindowStart] = useState(today);
  const [windowEnd, setWindowEnd] = useState(today);
  const [techniques, setTechniques] = useState<TechniqueId[]>(["external", "web"]);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [refCode, setRefCode] = useState("");
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const memory = readClientMemory();
    if (memory.client) setSigner((s) => ({ ...s, name: memory.client!.name, email: memory.client!.email, company: memory.client!.company }));
    const code = new URLSearchParams(window.location.search).get("order");
    if (code) setRefCode(code.toUpperCase());
  }, []);

  const set = (k: keyof Signer) => (e: React.ChangeEvent<HTMLInputElement>) => setSigner((s) => ({ ...s, [k]: e.target.value }));
  const toggle = (id: TechniqueId) => setTechniques((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const isAuth = kind === "authorization";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const request: SignRequest = {
      kind, signer, signature, consent, refCode: refCode.trim() || null,
      fields: isAuth ? { inScope, outOfScope, windowStart, windowEnd, techniques, emergencyName, emergencyPhone } : { purpose },
    };
    const problems = validateSignRequest(request);
    setErrors(problems);
    if (problems.length > 0) return;
    setIsBusy(true);
    try {
      const signed = await call<Agreement>("/api/agreements", { method: "POST", body: request });
      router.push(`/agreements/${signed.code}?new=1`);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Couldn't sign right now. Please try again."]);
      setIsBusy(false);
    }
  };

  return (
    <form id="sign" className="sign-form" onSubmit={submit} noValidate>
      <div className="sign-head">
        <span className="eyebrow">Sign online</span>
        <h2>{isAuth ? "Authorise the test" : "Sign the NDA"}</h2>
        <p>Takes a minute. You&apos;ll get a private link to your signed copy, with the exact wording, the time and a fingerprint of the document.</p>
      </div>

      <fieldset>
        <legend>{isAuth ? "1 · Who is authorising" : "1 · Who is signing"}</legend>
        <div className="form-grid">
          <Field id="sg-name" label="Full name"><input id="sg-name" className="input" autoComplete="name" value={signer.name} onChange={set("name")} required /></Field>
          <Field id="sg-email" label="Email"><input id="sg-email" className="input" type="email" inputMode="email" autoComplete="email" value={signer.email} onChange={set("email")} required /></Field>
          <Field id="sg-co" label="Company" hint={isAuth ? "(owner of the systems)" : "(optional)"}><input id="sg-co" className="input" autoComplete="organization" value={signer.company} onChange={set("company")} required={isAuth} /></Field>
          <Field id="sg-role" label="Role or title"><input id="sg-role" className="input" autoComplete="organization-title" placeholder={isAuth ? "e.g. CTO, IT Manager" : "e.g. Founder"} value={signer.role} onChange={set("role")} required /></Field>
        </div>
      </fieldset>

      {isAuth ? (
        <fieldset>
          <legend>2 · Rules of engagement</legend>
          <Field id="sg-in" label="In scope" hint="(one per line: domains, IP ranges, apps, office address)"><textarea id="sg-in" className="input" rows={4} maxLength={4000} placeholder={"app.example.co.zw\n196.x.x.0/28\nAndroid app com.example.pay"} value={inScope} onChange={(e) => setInScope(e.target.value)} required /></Field>
          <Field id="sg-out" label="Out of scope" hint="(optional)"><textarea id="sg-out" className="input" rows={2} maxLength={2000} placeholder="e.g. payment gateway, third-party hosting panel" value={outOfScope} onChange={(e) => setOutOfScope(e.target.value)} /></Field>
          <div className="form-grid">
            <Field id="sg-start" label="Testing starts"><input id="sg-start" className="input" type="date" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} required /></Field>
            <Field id="sg-end" label="Testing ends"><input id="sg-end" className="input" type="date" value={windowEnd} min={windowStart} onChange={(e) => setWindowEnd(e.target.value)} required /></Field>
          </div>
          <div className="field">
            <span className="field-label" id="sg-tech">Techniques allowed</span>
            <div className="tech-grid" role="group" aria-labelledby="sg-tech">
              {TEST_TECHNIQUES.map((t) => (
                <label key={t.id} className={`tech${techniques.includes(t.id) ? " on" : ""}`}>
                  <input type="checkbox" checked={techniques.includes(t.id)} onChange={() => toggle(t.id)} />{t.label}
                </label>
              ))}
            </div>
            <small className="hint">Denial-of-service and destructive actions are never included unless agreed separately in writing.</small>
          </div>
          <div className="form-grid">
            <Field id="sg-en" label="Emergency contact"><input id="sg-en" className="input" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} required /></Field>
            <Field id="sg-ep" label="Their phone"><input id="sg-ep" className="input" type="tel" inputMode="tel" placeholder="+263 77 123 4567" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} required /></Field>
          </div>
          <Field id="sg-ref" label="Order code" hint="(optional, R1V-…)"><input id="sg-ref" className="input mono" value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} maxLength={20} /></Field>
        </fieldset>
      ) : (
        <fieldset>
          <legend>2 · What it covers</legend>
          <Field id="sg-purpose" label="Purpose" hint="(optional)"><textarea id="sg-purpose" className="input" rows={3} maxLength={1000} placeholder="e.g. Discussing a mobile payments app and its architecture" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></Field>
          <Field id="sg-ref" label="Order or ticket code" hint="(optional, R1V-…)"><input id="sg-ref" className="input mono" value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} maxLength={20} /></Field>
        </fieldset>
      )}

      <fieldset className="sign-block">
        <legend>3 · Signature</legend>
        <Field id="sg-sig" label="Type your full name to sign"><input id="sg-sig" className="input sig-input" autoComplete="off" spellCheck={false} placeholder={signer.name || "Your full name"} value={signature} onChange={(e) => setSignature(e.target.value)} required /></Field>
        <label className="terms-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>I have read this {isAuth ? "authorisation" : "agreement"}, I have authority to sign it{signer.company.trim() ? ` for ${signer.company.trim()}` : ""}, and typing my name above is my electronic signature.</span>
        </label>
      </fieldset>

      {errors.length > 0 && <div className="error-box" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
      <button className="btn btn-lime" type="submit" disabled={isBusy}><span>{isBusy ? "Signing…" : isAuth ? "Sign authorisation" : "Sign NDA"}</span><span className="arrow"><ArrowUpRight size={16} /></span></button>
    </form>
  );
}
