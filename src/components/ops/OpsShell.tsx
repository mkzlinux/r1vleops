"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getSupabase, isCloudflareBackend, isSupabaseConfigured } from "@/lib/data";
import { Brand } from "../site/SiteChrome";

type GateState = "checking" | "signed-in" | "signed-out";

/** Cloudflare mode: operator password -> httpOnly session cookie set by /api/ops/login. */
function PasswordGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ops/session", { cache: "no-store" })
      .then((r) => { if (!cancelled) setState(r.ok ? "signed-in" : "signed-out"); })
      .catch(() => { if (!cancelled) setState("signed-out"); });
    return () => { cancelled = true; };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/ops/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) { setPassword(""); setState("signed-in"); } else setNote(body.error ?? "Sign-in failed.");
    } catch {
      setNote("Can't reach the server. Try again.");
    } finally {
      setIsBusy(false);
    }
  };

  if (state === "signed-in") return <>{children}</>;
  return (
    <div className="ops gate">
      <form className="glass" onSubmit={submit}>
        <Brand height={22} /><span className="mode-pill">Ops</span>
        <h1>Operator sign-in</h1>
        {state === "checking" ? <p className="hint-line">Checking session…</p> : (
          <>
            <div className="field"><label htmlFor="g-pass">Password</label><input id="g-pass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></div>
            <button className="btn btn-lime" type="submit" disabled={isBusy} style={{ justifyContent: "center" }}>{isBusy ? "Signing in…" : "Sign in"}</button>
            {note && <p className="hint-line" role="alert">{note}</p>}
          </>
        )}
      </form>
    </div>
  );
}

/** Signs in the operator: password in Cloudflare mode, magic link in Supabase mode; opens directly in local demo mode. */
export function OpsGate({ children }: { children: ReactNode }) {
  return isCloudflareBackend ? <PasswordGate>{children}</PasswordGate> : <SupabaseGate>{children}</SupabaseGate>;
}

function SupabaseGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>(isSupabaseConfigured ? "checking" : "signed-in");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    db.auth.getSession().then(({ data }) => setState(data.session ? "signed-in" : "signed-out"));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => setState(session ? "signed-in" : "signed-out"));
    return () => sub.subscription.unsubscribe();
  }, []);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const db = getSupabase();
    if (!db) return;
    const { error } = await db.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/ops`, shouldCreateUser: false } });
    setNote(error ? error.message : "Check your inbox for a sign-in link.");
  };

  if (state === "signed-in") return <>{children}</>;
  return (
    <div className="ops gate">
      <form className="glass" onSubmit={send}>
        <Brand height={22} /><span className="mode-pill">Ops</span>
        <h1>Operator sign-in</h1>
        {state === "checking" ? <p className="hint-line">Checking session…</p> : (
          <>
            <div className="field"><label htmlFor="g-email">Email</label><input id="g-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <button className="btn btn-lime" type="submit" style={{ justifyContent: "center" }}>Send magic link</button>
            {note && <p className="hint-line" role="status">{note}</p>}
          </>
        )}
      </form>
    </div>
  );
}
