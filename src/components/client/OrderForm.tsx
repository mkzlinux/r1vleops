"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { COMPANY } from "@/lib/catalog";
import { readClientMemory, rememberClient } from "@/lib/clientMemory";
import { getRepository } from "@/lib/data";
import { MAX_FILES, formatBytes, validateFiles } from "@/lib/files";
import { formatUsd, validateNewOrder } from "@/lib/orders";
import type { Client } from "@/lib/types";
import { useBucket } from "../bucket/BucketProvider";
import { ArrowUpRight, BucketIcon, Close, Upload } from "../Icons";
import { TERMS_REQUIRED, TermsCheckbox } from "../legal/TermsCheckbox";
import { AcceptedPayments } from "./PayLogos";
import { isCloudflareBackend } from "@/lib/data";
import { getPaymentOptions } from "@/lib/data/paymentsApi";
import { EVM_CHAIN_IDS, type UsdcChain } from "@/lib/payments";

const EMPTY_CLIENT: Client = { name: "", company: "", email: "", whatsapp: "" };
const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg,.heic,.pdf,.ai,.eps,.psd,.fig,.zip,.txt,.doc,.docx,.ppt,.pptx";

function FileDrop({ files, onChange, isHighlighted }: { files: File[]; onChange: (f: File[]) => void; isHighlighted: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const accept = (incoming: File[]) => {
    const next = [...files, ...incoming].slice(0, MAX_FILES + 1);
    const errs = validateFiles(next);
    setProblems(errs);
    if (errs.length === 0) onChange(next);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setIsOver(false); accept([...e.dataTransfer.files]); };
  return (
    <div className="panel">
      <h2>3 · Files <small>(optional)</small></h2>
      <p className="hint">{isHighlighted ? "Creative work? Send your logo, photos, brand colours or a sample you like." : "Logos, images, documents or anything that helps us understand the job."}</p>
      <div
        className={`dropzone${isOver ? " over" : ""}${isHighlighted ? " creative" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        aria-label="Add files"
      >
        <span className="dz-ico"><Upload size={22} /></span>
        <b>Drop files here or tap to browse</b>
        <small>PNG, JPG, SVG, PDF, AI, PSD, ZIP… up to {MAX_FILES} files, 15 MB each</small>
        <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { accept([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      {problems.length > 0 && <div className="error-box" role="alert">{problems.map((p) => <div key={p}>{p}</div>)}</div>}
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span className="fl-name">{f.name}</span><small>{formatBytes(f.size)}</small>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><Close size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { bucket, services, priced, region, add, clear } = useBucket();
  const [client, setClient] = useState<Client>(EMPTY_CLIENT);
  const [brief, setBrief] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "placing" | "uploading">("idle");
  const [returningName, setReturningName] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [chains, setChains] = useState<readonly UsdcChain[]>(EVM_CHAIN_IDS);
  useEffect(() => {
    if (!isCloudflareBackend) return;
    let isLive = true;
    getPaymentOptions().then((o) => { if (isLive && o.usdc.length) setChains(o.usdc); }).catch(() => undefined);
    return () => { isLive = false; };
  }, []);

  // Returning client on this device: pre-fill their details (records themselves are keyed by email).
  useEffect(() => {
    const remembered = readClientMemory().client;
    if (remembered) { setClient(remembered); setReturningName(remembered.name.split(" ")[0] || null); }
  }, []);

  // Old links (/order?service=x) still work: drop that service into the bucket once.
  const seeded = useRef(false);
  useEffect(() => {
    const id = params.get("service");
    if (!seeded.current && id && services.some((s) => s.id === id) && !bucket.some((l) => l.serviceId === id)) {
      seeded.current = true;
      add(id);
    }
  }, [params, services, bucket, add]);

  const set = (k: keyof Client) => (v: string) => setClient((c) => ({ ...c, [k]: v }));
  const hasCreative = priced.lines.some((l) => l.service.departmentId === "creative");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    const input = { client, brief, items: bucket, region, acceptTerms };
    const problems = [...validateNewOrder(input), ...validateFiles(files), ...(acceptTerms ? [] : [TERMS_REQUIRED])];
    setErrors(problems);
    if (problems.length > 0) return;
    setStatus("placing");
    try {
      const repo = getRepository();
      const order = await repo.createOrder(input);
      rememberClient(client, order.trackingCode);
      let filesFailed = false;
      if (files.length > 0) {
        setStatus("uploading");
        // The order already exists: a failed upload must not invite a duplicate order.
        filesFailed = await repo.attachFiles(order, files).then(() => false, () => true);
      }
      clear();
      router.push(`/invoice/${order.trackingCode}?new=1${filesFailed ? "&files=failed" : ""}`);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Something went wrong. Please try again or message us on WhatsApp."]);
      setStatus("idle");
    }
  };

  if (priced.lines.length === 0) {
    return (
      <div className="empty-bucket panel">
        <span className="eb-ico"><BucketIcon size={30} /></span>
        <h2>Your bucket is empty</h2>
        <p className="hint">Pick what you need first: a pentest, an app, ten flyers. Then come back here to check out.</p>
        <Link href="/pricing" className="btn btn-dark"><span>Build your bucket</span><span className="arrow"><ArrowUpRight size={16} /></span></Link>
      </div>
    );
  }

  return (
    <form className="order-grid" onSubmit={submit} noValidate>
      <div>
        <div className="panel">
          <h2>1 · Your details</h2>
          <p className="hint">
            {returningName
              ? <>Welcome back, {returningName}. Your details are filled in; this order joins your history under {client.email}. <button type="button" className="linklike" onClick={() => { setClient(EMPTY_CLIENT); setReturningName(null); }}>Not you?</button></>
              : "We send updates on WhatsApp. Your invoice and tracking code appear right after you submit. Use the same email each time to keep all your orders together."}
          </p>
          <div className="form-grid">
            <div className="field"><label htmlFor="o-name">Full name *</label><input id="o-name" className="input" value={client.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" required /></div>
            <div className="field"><label htmlFor="o-co">Company</label><input id="o-co" className="input" value={client.company} onChange={(e) => set("company")(e.target.value)} autoComplete="organization" /></div>
            <div className="field"><label htmlFor="o-email">Email *</label><input id="o-email" type="email" className="input" value={client.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" inputMode="email" required /></div>
            <div className="field"><label htmlFor="o-wa">WhatsApp number *</label><input id="o-wa" type="tel" className="input" placeholder="+263 77 123 4567" value={client.whatsapp} onChange={(e) => set("whatsapp")(e.target.value)} autoComplete="tel" inputMode="tel" required /></div>
            <div className="sr-only" aria-hidden="true"><label htmlFor="o-hp">Leave empty</label><input id="o-hp" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></div>
          </div>
        </div>
        <div className="panel">
          <h2>2 · The brief</h2>
          <p className="hint">Goals, deadline, sizes, wording for flyers, links, anything we should know.</p>
          <textarea id="o-brief" aria-label="Project brief" className="input" maxLength={4000} value={brief} onChange={(e) => setBrief(e.target.value)} />
        </div>
        <FileDrop files={files} onChange={setFiles} isHighlighted={hasCreative} />
      </div>

      <aside className="summary" aria-live="polite">
        <div className="sum-head"><span className="eyebrow" style={{ color: "#8f8f8c" }}>Your bucket · {region === "zw" ? "Zimbabwe" : "International"} prices</span><Link href="/pricing">Edit</Link></div>
        {priced.lines.map((l) => (
          <div className="row" key={l.service.id}><span>{l.qty > 1 ? `${l.qty} × ` : ""}{l.service.name}</span><b>{formatUsd(l.amount)}</b></div>
        ))}
        <div className="dep"><small>Due now to start · {COMPANY.depositPct}% deposit</small><div className="big">{formatUsd(priced.deposit)}</div><small>Balance {formatUsd(priced.balance)} on delivery</small></div>
        <div><small>Total</small><div className="big total">{formatUsd(priced.total)}</div></div>
        <p className="sum-note">Want a different price? <Link href="/pricing">Negotiate from your bucket</Link> before checking out.</p>
        <TermsCheckbox id="o-terms" checked={acceptTerms} onChange={setAcceptTerms} isDark />
        {errors.length > 0 && <div className="error-box" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
        <button className="btn btn-lime" type="submit" disabled={status !== "idle"}>
          <span>{status === "placing" ? "Generating invoice…" : status === "uploading" ? "Uploading files…" : "Place order & get invoice"}</span><span className="arrow"><ArrowUpRight size={16} /></span>
        </button>
        <AcceptedPayments chains={chains} isDark />
      </aside>
    </form>
  );
}
