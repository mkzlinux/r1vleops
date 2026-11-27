# r1vleops

R1VLE's public site and the founder's operations campus.

| Part | Where | Stack |
|------|-------|-------|
| Landing page, pricing, WhatsApp negotiation | `/` | Next.js (App Router), three.js hero |
| Pricing: build a bucket (animated, mobile bottom sheet), negotiate under the total | `/pricing` | Next.js |
| Checkout with file uploads → invoice + tracking code → 50% deposit | `/order`, `/invoice/[code]` | Next.js |
| Client project tracking | `/track?code=R1V-XXXX-XXXX` | Next.js |
| Ops dashboard: forecast overview, department rooms, order drawer | `/ops`, `/ops/[room]` | Next.js + animated canvas background |

## How the pieces talk

Every page (site and `/ops`) reads and writes through one `R1vleRepository` (`src/lib/data`):
browser-local demo data by default, or **Cloudflare** (D1 database + R2 file storage) when
`NEXT_PUBLIC_DATA_BACKEND=cloudflare`. A Supabase adapter also remains available. Business rules (pricing, buckets, invoice numbers,
tracking codes, stages, stats, the ops "forecast") live in `src/lib` and are unit tested.

The `/ops` background (`src/components/ops/OpsBackground.tsx`) is a canvas "tech storm": drifting
clouds, a node network, a wireframe field and circuit-lightning striking today's timeline point.
It pauses when the tab is hidden and renders a still frame for reduced-motion users.

## Commands

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # unit + server tests (vitest; server tests run the real D1 schema on node:sqlite)
npm run seed:sql       # regenerates supabase/seed.sql from the catalog
```

## Going live on Cloudflare (D1 + R2)

The browser never talks to Cloudflare directly. Next.js API routes (`src/app/api`) hold the
credentials and use `src/server`: D1 over its REST API, R2 over its S3 API (presigned URLs, so
client files up to 15 MB go straight to R2 and skip Vercel's 4.5 MB body limit).

Already created: D1 database `r1vleops` (schema in `cloudflare/schema.sql`, five AI workers seeded)
and R2 bucket `r1vleops-order-files`.

1. Cloudflare dashboard → My Profile → API Tokens → Create token (custom) with
   **Account · D1 · Edit** and **Account · Workers R2 Storage · Edit**. Note the token's **ID** and its value.
2. In Vercel → Project → Settings → Environment Variables (Production), add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_DATA_BACKEND` | `cloudflare` |
   | `CLOUDFLARE_ACCOUNT_ID` | your account ID (Cloudflare dashboard sidebar) |
   | `CLOUDFLARE_D1_DATABASE_ID` | `525d53e5-6419-44ac-bc39-ded8b4104e12` |
   | `CLOUDFLARE_API_TOKEN` | the token value (mark Sensitive) |
   | `CLOUDFLARE_API_TOKEN_ID` | the token ID |
   | `R2_BUCKET` | `r1vleops-order-files` |
   | `OPS_PASSWORD` | a long password for `/ops` (Sensitive) |
   | `OPS_SESSION_SECRET` | 32+ random characters, e.g. `openssl rand -hex 32` (Sensitive) |

3. Redeploy. Sign in at `/ops` once: that also allows the site to upload files to R2 (bucket CORS).

Security: prices are always recomputed on the server; public tracking hides contact details and the
brief; public endpoints are rate limited per IP in D1; `/ops` APIs need an httpOnly, SameSite=strict,
HMAC-signed session cookie and same-origin requests.

## Online payments: Paynow and USDC

Clients pay from their invoice page (`/invoice/<code>`): the **deposit** while the order awaits it,
and the **balance** once work is in review or delivered. Amounts always come from the stored invoice.
A confirmed deposit moves the order to "Deposit confirmed"; a confirmed balance closes it. Every
payment shows in `/ops` (order drawer, with a Re-check button) and as a receipt line on the invoice.

| Option | How it's confirmed |
|--------|--------------------|
| Paynow: EcoCash, OneMoney, InnBucks (push to phone) and cards (Paynow page) | Paynow's signed status update to `/api/paynow/result`, plus polling. Hash verified (SHA-512) and the paid amount must cover what's due |
| USDC on BNB Smart Chain (BEP-20), Base, Arbitrum, Optimism, Polygon, Avalanche, Ethereum (listed last: high fees) | Each payment gets a unique amount (up to $0.009999 extra); the server finds that exact Transfer to your wallet on-chain |
| USDC on Solana | Same unique-amount method; the server checks your wallet's USDC balance changes |
| USDC on Stellar / XRP Ledger | A unique memo (Stellar) or destination tag (XRPL) identifies the invoice |

A transaction or Paynow reference can only ever settle one payment. Unpaid requests expire after 24 hours.

Settings (Vercel → Environment Variables). Each option switches on only when its settings exist:

| Name | Value |
|------|-------|
| `PAYNOW_INTEGRATION_ID` | from Paynow → Receive payments → your USD integration |
| `PAYNOW_INTEGRATION_KEY` | the integration key (Sensitive) |
| `USDC_WALLET_EVM` | your 0x… address; used on every EVM network (same address on all of them) |
| `USDC_EVM_CHAINS` | optional, comma list to limit EVM networks, e.g. `bsc,base,arbitrum` (default: all) |
| `USDC_WALLET_SOLANA` | your Solana address |
| `USDC_WALLET_STELLAR` | your G… Stellar address. It needs a USDC trustline (issuer `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`) |
| `USDC_WALLET_XRPL` | your r… XRPL address. It needs a trust line to USDC issuer `rGm7WCVp9gb4jZHWTEtGUr4dd74z2XuWhE` |
| `USDC_WALLET_<CHAIN>` | optional per-network override, e.g. `USDC_WALLET_BSC` |
| `PAYNOW_MODE` + `PAYNOW_TEST_EMAIL` | set `PAYNOW_MODE=test` and your Paynow login email while using test keys; the pay panel then says "Test mode". Remove both when you switch to live keys |
| `SITE_URL` | optional, defaults to `https://r1vleops.vercel.app` (Paynow return/result links) |
| `USDC_RPC_<CHAIN>` | optional, override a public RPC/Horizon endpoint |

USDC tokens used are listed in `USDC_CHAINS` (`src/lib/payments.ts`): Circle-native USDC everywhere
except BNB Smart Chain, which uses Binance-Peg USDC (18 decimals).

## Connecting Supabase (alternative)

1. Create a project, run `supabase/migrations/0001_init.sql`, `0002_items_and_files.sql`, `0003_regional_pricing.sql`, then `supabase/seed.sql`.
2. Add your auth user's id to `public.admins` so `/ops` can read and edit everything.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).

Public visitors can only read prices, call `create_order` and call `track_order`; prices are
always taken from the database, and tracking never exposes client contact details.

## Editing prices and contact details

- Starter prices: `src/lib/catalog.ts` (or edit live in `/ops` → any room → Pricing tab).
- WhatsApp number: `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- Payment options and issuer details on invoices: `COMPANY` in `src/lib/catalog.ts`.

## Brand & payments

- Logo files: `public/brand/` (full logo with tagline + tagline-free wordmark, black and white).
- Colours ("Metal & Signal"): metal black `#0E0F11`→`#2B2F34`, signal lime `#C8F53B`, paper `#F3F3EF`, R1VLE red `#E0403A` for tiny accents only.
- Payment methods live in `PAYMENT_METHODS` (`src/lib/catalog.ts`). EcoCash, PayPal and USDC show as
  "coming soon"; until they're integrated, deposits are arranged on WhatsApp. No account numbers are published.

## Regional pricing

Visitors are detected as Zimbabwe or International (`/api/region`, from Vercel's IP country header),
and can switch on `/pricing`. Services may define `regional` tiers in `src/lib/catalog.ts`, e.g.
Zimbabwe flyers `$20` for one and `$17` each for 2+, and Zimbabwe logos `$20`. Everything else uses
the list price. Zimbabwe prices only check out with a +263 WhatsApp number; the database enforces the
same rule and computes prices server-side.
