import { USDC_CHAINS, findEvmTransfer, findXrplPayment, transferTopicsTo, type EvmLog, type XrplTx } from "@/lib/payments";

const BLOCK_CHUNK = 2_000;
const MAX_CHUNKS_PER_CHECK = 6;
const CONFIRMATIONS = 3;
const START_MARGIN = 25;

export const DEFAULT_RPC = {
  base: "https://base-rpc.publicnode.com",
  bsc: "https://bsc-rpc.publicnode.com",
  xrpl: "https://xrplcluster.com",
} as const;

async function rpc<T>(fetcher: typeof fetch, url: string, method: string, params: unknown): Promise<T> {
  const res = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store" });
  const body = (await res.json().catch(() => null)) as { result?: T; error?: { message?: string } } | null;
  if (!res.ok || !body || body.error || body.result === undefined) throw new Error(`${method} failed: ${body?.error?.message ?? res.status}`);
  return body.result;
}

export interface EvmScan { readonly txHash: string | null; readonly nextFrom: number }

/** Checks an EVM chain for an exact USDC transfer to `wallet`, scanning forward from `fromBlock` in chunks. */
export function evmChecker(chain: "base" | "bsc", rpcUrl: string, fetcher: typeof fetch = fetch) {
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

export type EvmChecker = ReturnType<typeof evmChecker>;
export type XrplChecker = ReturnType<typeof xrplChecker>;
