import { NextResponse, type NextRequest } from "next/server";
import { regionFromCountry } from "@/lib/pricing";

/** Visitor's pricing region from Vercel's geo header. Not authoritative: checkout also checks the WhatsApp number. */
export function GET(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country");
  return NextResponse.json(
    { country: country ?? null, region: regionFromCountry(country) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
