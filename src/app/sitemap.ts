import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { LEGAL_DOC_IDS } from "@/lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/request`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/legal`, changeFrequency: "yearly", priority: 0.4 },
    ...LEGAL_DOC_IDS.map((id) => ({ url: `${SITE_URL}/legal/${id}`, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
