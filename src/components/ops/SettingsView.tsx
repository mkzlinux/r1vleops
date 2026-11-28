"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { isCloudflareBackend } from "@/lib/data";
import { apiCaller } from "@/lib/data/httpRepository";
import { OpsFrame, OpsSky } from "./OpsFrame";

const call = apiCaller();
type Status = { enabled: boolean; recoveryLeft: number };

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = `R1VLE Ops recovery codes (each works once)\n\n${codes.join("\n")}\n`;
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "r1vle-ops-recovery-codes.txt" });
    a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="mfa-codes">
      <p><b>Save these recovery codes now.</b> Each one signs you in once if you lose your phone. They won&apos;t be shown again.</p>
      <ol>{codes.map((c) => <li key={c} className="mono">{c}</li>)}</ol>
      <div className="quick">
        <button type="button" onClick={download}>Download .txt</button>
        <button type="button" onClick={() => navigator.clipboard?.writeText(text).catch(() => undefined)}>Copy</button>
        <button type="button" onClick={onDone}>I&apos;ve saved them</button>
      </div>
    </div>
  );
}

function TwoStep() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = () => call<Status>("/api/ops/mfa").then(setStatus).catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load."));
  useEffect(() => { void load(); }, []);

  const act = async (fn: () => Promise<void>) => {
    setIsBusy(true); setError(null);
    try { await fn(); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setIsBusy(false); }
  };
  const start = () => act(async () => {
    const s = await call<{ secret: string; uri: string }>("/api/ops/mfa", { method: "POST", body: { action: "setup" } });
    setSetup({ secret: s.secret, qr: await QRCode.toDataURL(s.uri, { margin: 1, width: 220 }) });
  });
  const confirm = () => act(async () => {
    const r = await call<{ recoveryCodes: string[] }>("/api/ops/mfa", { method: "POST", body: { action: "confirm", code } });
    setSetup(null); setCode(""); setCodes(r.recoveryCodes); await load();
  });
  const regenerate = () => act(async () => {
    const r = await call<{ recoveryCodes: string[] }>("/api/ops/mfa", { method: "POST", body: { action: "recovery", code } });
    setCode(""); setCodes(r.recoveryCodes); await load();
  });
  const disable = () => act(async () => {
    await call("/api/ops/mfa", { method: "POST", body: { action: "disable", code } });
    setCode(""); await load();
  });

  if (codes) return <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />;
  if (!status) return <p className="dim">{error ?? "Loading…"}</p>;

  return (
    <div className="mfa">
      <div className="mfa-head">
        <span className={`stage-pill ${status.enabled ? "deposit_confirmed" : "awaiting_deposit"}`}>{status.enabled ? "On" : "Off"}</span>
        <div>
          <b>Two-step sign-in</b>
          <p className="dim">{status.enabled ? `Your password and a 6-digit code from your phone are both required. ${status.recoveryLeft} recovery code${status.recoveryLeft === 1 ? "" : "s"} left.` : "Add a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password…) on top of your password."}</p>
        </div>
      </div>

      {!status.enabled && !setup && <button type="button" className="btn btn-dark" onClick={start} disabled={isBusy}><span>Turn on two-step sign-in</span></button>}

      {setup && (
        <div className="mfa-setup">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR code to add R1VLE Ops to your authenticator app" width={220} height={220} />
          <div>
            <ol className="mfa-steps">
              <li>Open your authenticator app and scan this code.</li>
              <li>Can&apos;t scan? Enter this key: <code className="mono">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code></li>
              <li>Type the 6-digit code it shows:</li>
            </ol>
            <div className="mfa-row">
              <input className="g-input gate-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
              <button type="button" className="btn btn-lime" onClick={confirm} disabled={isBusy || code.length !== 6}><span>Confirm</span></button>
            </div>
          </div>
        </div>
      )}

      {status.enabled && (
        <div className="g-form">
          <label className="dr-range">Current code (or a recovery code)
            <input className="g-input gate-code" inputMode="numeric" autoComplete="one-time-code" maxLength={11} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </label>
          <div className="quick">
            <button type="button" disabled={isBusy || !code} onClick={regenerate}>New recovery codes</button>
            <button type="button" disabled={isBusy || !code} onClick={disable}>Turn off two-step sign-in</button>
          </div>
        </div>
      )}
      {error && <p className="g-error" role="alert">{error}</p>}
    </div>
  );
}

export function SettingsView() {
  return (
    <OpsFrame active="settings">
      <div className="room-grid">
        <section className="room-main">
          <OpsSky className="room-hero" strikeTarget={{ x: 0.8, y: 0.4 }}>
            <span className="ops-chip"><i />Settings</span>
            <h1>Security &amp; sign-in</h1>
            <p>Protect the back office: who can sign in, and how.</p>
          </OpsSky>
          <div className="room-panel mfa-panel">
            {isCloudflareBackend ? <TwoStep /> : <p className="dim">Two-step sign-in is available on the live (Cloudflare) backend. Demo mode has no sign-in.</p>}
          </div>
        </section>
      </div>
    </OpsFrame>
  );
}
