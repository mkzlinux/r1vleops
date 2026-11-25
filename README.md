# r1vleops

R1VLE's public site and the founder's operations campus.

| Part | Where | Stack |
|------|-------|-------|
| Landing page, pricing, WhatsApp negotiation | `/` | Next.js (App Router), three.js hero |
| Order → invoice with tracking code → 50% deposit | `/order`, `/invoice/[code]` | Next.js |
| Client project tracking | `/track?code=R1V-XXXX-XXXX` | Next.js |
| Ops campus (3D land, department buildings, rooms) | `/ops` | **Godot 4** web export in `godot/`, embedded via iframe |

## How the pieces talk

```
Godot (godot/autoload/ops_api.gd)
   │  JavaScriptBridge → window.parent.r1vleOps.request(method, json, callback)
   ▼
/ops page (src/components/ops/GodotHost.tsx)
   │  createOpsBridge(repo)   ← src/lib/opsBridge.ts (validates every call)
   ▼
R1vleRepository (src/lib/data)
   ├─ local: browser localStorage demo data (default)
   └─ supabase: when NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set
```

All business rules (pricing, invoice numbers, tracking codes, stages, stats) live in TypeScript
under `src/lib` and are unit tested. Godot is the view: campus, buildings, rooms, HUD.

## Commands

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # unit tests (vitest)
npm run godot:export   # downloads Godot + web templates once, exports to public/ops-app/
npm run godot:test     # headless Godot tests (after godot:export has downloaded the editor)
npm run seed:sql       # regenerates supabase/seed.sql from the catalog
```

## Connecting Supabase later

1. Create a project, run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
2. Add your auth user's id to `public.admins` so `/ops` can read and edit everything.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).

Public visitors can only read prices, call `create_order` and call `track_order`; prices are
always taken from the database, and tracking never exposes client contact details.

## Editing prices and contact details

- Starter prices: `src/lib/catalog.ts` (or edit live in the Godot room → Pricing tab).
- WhatsApp number: `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- Payment options and issuer details on invoices: `COMPANY` in `src/lib/catalog.ts`.
