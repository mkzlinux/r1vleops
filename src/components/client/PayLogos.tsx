/* eslint-disable @next/next/no-img-element -- tiny static SVGs; next/image adds nothing here */
import { USDC_CHAINS, type PaynowChannel, type UsdcChain } from "@/lib/payments";

/** Chain logos live in /public/pay (from web3icons, MIT). Card marks from simple-icons (CC0). */
export function ChainLogo({ chain, size = 18 }: { chain: UsdcChain; size?: number }) {
  return <span className="logo-dot" style={{ width: size + 6, height: size + 6 }}><img src={`/pay/${chain}.svg`} alt="" width={size} height={size} /></span>;
}

export function UsdcLogo({ size = 18 }: { size?: number }) {
  return <img className="logo-raw" src="/pay/usdc.svg" alt="" width={size} height={size} />;
}

export function CardLogos({ size = 22 }: { size?: number }) {
  return (
    <span className="card-logos" aria-label="Visa and Mastercard">
      <span className="card-tile"><img src="/pay/visa.svg" alt="" width={size} height={size} /></span>
      <span className="card-tile"><img src="/pay/mastercard.svg" alt="" width={size} height={size} /></span>
    </span>
  );
}

/** Mobile-money brands as type marks until official logo files are supplied. */
const WALLET_MARK: Record<Exclude<PaynowChannel, "web">, { text: string; cls: string }> = {
  ecocash: { text: "EcoCash", cls: "mm-ecocash" },
  onemoney: { text: "OneMoney", cls: "mm-onemoney" },
  innbucks: { text: "InnBucks", cls: "mm-innbucks" },
};

export function PaynowMark({ channel }: { channel: PaynowChannel }) {
  if (channel === "web") return <><CardLogos /><span>Card &amp; more</span></>;
  const m = WALLET_MARK[channel];
  return <span className={`mm-mark ${m.cls}`}>{m.text}</span>;
}

/** "We accept" strip for checkout and invoices. */
export function AcceptedPayments({ chains, isDark = false }: { chains: readonly UsdcChain[]; isDark?: boolean }) {
  return (
    <div className={`accepts${isDark ? " dark" : ""}`}>
      <small>Pay with</small>
      <div className="accepts-row">
        <PaynowMark channel="ecocash" /><PaynowMark channel="onemoney" /><PaynowMark channel="innbucks" /><CardLogos size={20} />
      </div>
      <div className="accepts-row">
        <span className="usdc-pill"><UsdcLogo size={16} />USDC</span>
        <span className="chain-stack">{chains.map((c) => <span key={c} title={USDC_CHAINS[c].label}><ChainLogo chain={c} size={14} /></span>)}</span>
      </div>
    </div>
  );
}
