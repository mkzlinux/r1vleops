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
browser-local demo data by default, Supabase when `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set. Business rules (pricing, buckets, invoice numbers,
tracking codes, stages, stats, the ops "forecast") live in `src/lib` and are unit tested.

The `/ops` background (`src/components/ops/OpsBackground.tsx`) is a canvas "tech storm": drifting
clouds, a node network, a wireframe field and circuit-lightning striking today's timeline point.
It pauses when the tab is hidden and renders a still frame for reduced-motion users.

## Commands

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # unit tests (vitest)
npm run seed:sql       # regenerates supabase/seed.sql from the catalog
```

## Connecting Supabase later

1. Create a project, run `supabase/migrations/0001_init.sql`, `0002_items_and_files.sql`, then `supabase/seed.sql`.
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
