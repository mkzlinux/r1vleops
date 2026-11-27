// R1VLE payment sweeper: every 2 minutes, asks the site to re-check pending payments
// (Paynow status + on-chain USDC), so they confirm even when nobody has the invoice open.
const SWEEP_URL = "https://r1vleops.vercel.app/api/cron/payments";

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      fetch(env.SWEEP_URL || SWEEP_URL, { headers: { "User-Agent": "r1vle-payment-sweeper" } })
        .then((r) => r.text().then((t) => console.log(r.status, t.slice(0, 300))))
        .catch((e) => console.error("sweep failed", e)),
    );
  },
  async fetch() {
    return new Response("R1VLE payment sweeper (scheduled only)", { status: 200 });
  },
};
