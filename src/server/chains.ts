import { USDC_CHAINS, findEvmTransfer, findSolanaPayment, findStellarPayment, findXrplPayment, transferTopicsTo, type EvmChainId, type EvmLog, type SolanaTx, type StellarPaymentRecord, type UsdcChain, type XrplTx } from "@/lib/payments";

const BLOCK_CHUNK = 2_000;
const MAX_CHUNKS_PER_CHECK = 6;
const CONFIRMATIONS = 3;
const START_MARGIN = 25;

/** Public endpoints; each can be overridden with USDC_RPC_<CHAIN>. */
export const DEFAULT_RPC: Record<UsdcChain, string> = {
  bsc: "https://bsc-rpc.publicnode.com",
  base: "https://base-rpc.publicnode.com",
  arbitrum: "https://arbitrum-one-rpc.publicnode.com",
  optimism: "https://optimism-rpc.publicnode.com",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  avalanche: "https://avalanche-c-chain-rpc.publicnode.com",
  ethereum: "https://ethereum-rpc.publicnode.com",
  solana: "https://solana-rpc.publicnode.com",
  stellar: "https://horizon.stellar.org",
  xrpl: "https://xrplcluster.com",
};

async function rpc<T>(fetcher: typeof fetch, url: string, method: string, params: unknown): Promise<T> {
  const res = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store" });
  const body = (await res.json().catch(() => null)) as { result?: T; error?: { message?: string } } | null;
  if (!res.ok || !body || body.error || body.result === undefined) throw new Error(`${method} failed: ${body?.error?.message ?? res.status}`);
  return body.result;
}

export interface EvmScan { readonly txHash: string | null; readonly nextFrom: number }

/** Checks an EVM chain for an exact USDC transfer to `wallet`, scanning forward from `fromBlock` in chunks. */
export function evmChecker(chain: EvmChainId, rpcUrl: string, fetcher: typeof fetch = fetch) {
  const c = USDC_CHAINS[chain];
  return {
    async startBlock(): Promise<number> {
      return Math.max(0, Number(BigInt(await rpc<string>(fetcher, rpcUrl, "eth_blockNumber", []))) - START_MARGIN);
    },
    async scan(wallet: string, units: bigint, fromBlock: number): Promise<EvmScan> {
      const head = Number(BigInt(await rpc<string>(fetcher, rpcUrl, "eth_blockNumber", []))) - CONFIRMATIONS;
      let from = fromBlock;
      for (let i = 0; i < MAX_CHUNKS_PER_CHECK && from <= head; i += 1) {
        const to = Math.min(head, from + BLOCK_CHUNK - 1);
        const logs = await rpc<EvmLog[]>(fetcher, rpcUrl, "eth_getLogs", [{ address: c.token, topics: transferTopicsTo(wallet), fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }]);
        const tx = findEvmTransfer(logs, { token: c.token, wallet, units, decimals: c.decimals });
        if (tx) return { txHash: tx, nextFrom: to + 1 };
        from = to + 1;
      }
      return { txHash: null, nextFrom: from };
    },
  };
}

/** Checks the XRP Ledger for a validated USDC payment with the destination tag. */
export function xrplChecker(rpcUrl: string, fetcher: typeof fetch = fetch) {
  return {
    async find(wallet: string, tag: number, minUsd: number): Promise<string | null> {
      const res = await fetcher(rpcUrl, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ method: "account_tx", params: [{ account: wallet, ledger_index_min: -1, ledger_index_max: -1, limit: 200, forward: false }] }),
      });
      const body = (await res.json().catch(() => null)) as { result?: { status?: string; transactions?: XrplTx[]; error_message?: string } } | null;
      if (!res.ok || body?.result?.status !== "success") throw new Error(`account_tx failed: ${body?.result?.error_message ?? res.status}`);
      return findXrplPayment(body.result.transactions ?? [], { wallet, tag, minUsd });
    },
  };
}

const SOLANA_SIGNATURES = 40;
const SOLANA_TX_PER_CHECK = 15;

/** Checks Solana for a USDC transfer of exactly `units` to `wallet` since `since` (unix seconds). */
export function solanaChecker(rpcUrl: string, fetcher: typeof fetch = fetch) {
  return {
    async find(wallet: string, units: bigint, since: number): Promise<string | null> {
      const accounts = await rpc<{ value: { pubkey: string }[] }>(fetcher, rpcUrl, "getTokenAccountsByOwner", [wallet, { mint: USDC_CHAINS.solana.mint }, { encoding: "jsonParsed" }]);
      for (const { pubkey } of accounts.value) {
        const sigs = await rpc<{ signature: string; blockTime: number | null; err: unknown }[]>(fetcher, rpcUrl, "getSignaturesForAddress", [pubkey, { limit: SOLANA_SIGNATURES }]);
        const fresh = sigs.filter((x) => !x.err && (x.blockTime ?? 0) >= since).slice(0, SOLANA_TX_PER_CHECK);
        for (const { signature } of fresh) {
          const tx = await rpc<SolanaTx | null>(fetcher, rpcUrl, "getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
          if (tx && findSolanaPayment([tx], { wallet, units })) return signature;
        }
      }
      return null;
    },
  };
}

/** Checks Stellar (Horizon) for a USDC payment to `wallet` with the memo. */
export function stellarChecker(horizonUrl: string, fetcher: typeof fetch = fetch) {
  return {
    async find(wallet: string, memo: string, minUsd: number): Promise<string | null> {
      const res = await fetcher(`${horizonUrl}/accounts/${encodeURIComponent(wallet)}/payments?order=desc&limit=100&join=transactions`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Horizon payments failed: ${res.status}`);
      const body = (await res.json()) as { _embedded?: { records?: StellarPaymentRecord[] } };
      return findStellarPayment(body._embedded?.records ?? [], { wallet, memo, minUsd });
    },
  };
}

export type EvmChecker = ReturnType<typeof evmChecker>;
export type XrplChecker = ReturnType<typeof xrplChecker>;
