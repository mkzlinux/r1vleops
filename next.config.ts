import type { NextConfig } from "next";

/**
 * Content Security Policy. Next.js streams inline bootstrap scripts, so script-src needs
 * 'unsafe-inline' unless every page is rendered per-request with a nonce; everything else is
 * locked down: no plugins, no framing, no foreign forms, no base-tag hijacking, and network
 * calls only to this site and Cloudflare R2 (presigned client-file uploads).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.r2.cloudflarestorage.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const PRIVATE = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["three"],
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/ops/:path*", headers: PRIVATE },
      { source: "/ops", headers: PRIVATE },
      { source: "/invoice/:path*", headers: PRIVATE },
      { source: "/quote/:path*", headers: PRIVATE },
      { source: "/orders", headers: PRIVATE },
      { source: "/track", headers: PRIVATE },
      { source: "/api/:path*", headers: [...PRIVATE, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
