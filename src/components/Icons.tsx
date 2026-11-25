import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, ...rest };
}

export const ArrowUpRight = (p: IconProps) => <svg {...base(p)}><path d="M7 17 17 7M8 7h9v9" /></svg>;
export const ArrowLeft = (p: IconProps) => <svg {...base(p)}><path d="M19 12H5m6-6-6 6 6 6" /></svg>;
export const Check = (p: IconProps) => <svg {...base(p)}><path d="m5 12 5 5 9-10" /></svg>;
export const Shield = (p: IconProps) => <svg {...base(p)}><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
export const Chip = (p: IconProps) => <svg {...base(p)}><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" /></svg>;
export const Film = (p: IconProps) => <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4m10 0h4M3 15h4m10 0h4" /></svg>;
export const Coin = (p: IconProps) => <svg {...base(p)}><circle cx="12" cy="12" r="8" /><path d="M14.5 9.5c-.5-.9-1.4-1.3-2.5-1.3-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.3 5 3.9 0 1.1-1 1.9-2.5 1.9-1.2 0-2.1-.5-2.6-1.4M12 6.5v1.7m0 7.6v1.7" /></svg>;
export const Play = (p: IconProps) => <svg {...base(p)} fill="currentColor" stroke="none"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>;
export const Search = (p: IconProps) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const Printer = (p: IconProps) => <svg {...base(p)}><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2" /><rect x="6" y="14" width="12" height="7" /></svg>;
export const Users = (p: IconProps) => <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" /></svg>;
export const Bot = (p: IconProps) => <svg {...base(p)}><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6" /><circle cx="12" cy="3.5" r="1" /></svg>;
export const Plus = (p: IconProps) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const Close = (p: IconProps) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const Leaf = (p: IconProps) => <svg {...base(p)}><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15" /><path d="M5 19c3-4 6-7 10-9" /></svg>;

export function WhatsApp({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7 3.9Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.7.7 2.3.8 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.6-.4Z" />
    </svg>
  );
}
