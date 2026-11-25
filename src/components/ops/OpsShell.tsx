"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/data";

type GateState = "checking" | "signed-in" | "signed-out";

/** In Supabase mode, requires a signed-in admin (magic link). In local demo mode, opens directly. */
export function OpsGate({ children }: { children: ReactNode }) {
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
        <span className="mode-pill">R1VLE Ops</span>
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
