import { formatUsd } from "./orders";
import type { Region, Service } from "./types";

export const REGIONS: readonly { id: Region; label: string }[] = [
  { id: "zw", label: "Zimbabwe" },
  { id: "intl", label: "International" },
];

/** Unit price for a service in a region at a given quantity (volume tiers apply per region). */
export function unitPrice(service: Service, region: Region, qty: number): number {
  const tiers = service.regional?.[region];
  if (!tiers || tiers.length === 0) return service.priceUsd;
  const applicable = [...tiers].sort((a, b) => b.minQty - a.minQty).find((t) => qty >= t.minQty);
  return applicable?.priceUsd ?? service.priceUsd;
}

/** Short note about volume pricing, e.g. "$17 each for 2+", or null when there is none. */
export function priceNote(service: Service, region: Region): string | null {
  const tiers = service.regional?.[region];
  if (!tiers || tiers.length < 2) return null;
  const best = [...tiers].sort((a, b) => b.minQty - a.minQty)[0];
  const amount = formatUsd(best.priceUsd).replace(".00", "");
  return service.per ? `${amount} per ${service.per} from ${best.minQty} blocks` : `${amount} each for ${best.minQty}+`;
}

export function regionFromCountry(country: string | null | undefined): Region {
  return country?.toUpperCase() === "ZW" ? "zw" : "intl";
}

