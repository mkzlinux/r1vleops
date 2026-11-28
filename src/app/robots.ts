import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/** Crawlers: public marketing pages only. (Not a security control: private routes are protected server-side.) */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/pricing", "/about", "/request", "/legal"], disallow: ["/ops", "/agreements/", "/api/", "/invoice/", "/quote/", "/orders", "/track", "/order"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
