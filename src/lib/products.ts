/** R1VLE's own products, shown on /about and the homepage. */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly accent: string;
  readonly kind: string;
  readonly status: string;
  readonly line: string;
  readonly about: string;
  readonly points: readonly string[];
  readonly url?: string;
  readonly cta: { readonly label: string; readonly message: string };
}

export const PRODUCTS: readonly Product[] = [
  {
    id: "zifarmchain",
    name: "ZiFarmChain",
    accent: "#c8f53b",
    kind: "Agri-fintech",
    status: "Launching soon",
    line: "Farm-to-market traceability and finance on one ledger.",
    about: "Farmers, buyers and input suppliers share verified records of what was planted, sold and paid, so credit and trade move on trust.",
    points: ["Traceable records, field to market", "Settlement in USD and USDC", "Built by R1VLE Intelligence"],
    url: "https://zifarmchain.com",
    cta: { label: "Join early access", message: "Hi R1VLE, please add me to the ZiFarmChain early access list." },
  },
  {
    id: "fasta",
    name: "Fasta",
    accent: "#8e9bff",
    kind: "Mobility",
    status: "Coming soon",
    line: "Keke hailing, from your phone.",
    about: "Book a keke when you need one instead of waiting at the roadside. Fasta connects riders with keke drivers nearby.",
    points: ["Hail a keke in a few taps", "Riders and drivers on one app", "Built by R1VLE Intelligence"],
    cta: { label: "Get notified", message: "Hi R1VLE, please let me know when Fasta launches." },
  },
];
