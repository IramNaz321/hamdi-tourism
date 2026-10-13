import type { NextConfig } from "next";
import { configuredSiteOrigin } from "./src/lib/site-origin";
const origin = configuredSiteOrigin(process.env);
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.HAMDI_BROWSER_TESTS === "true" ? ".next-test" : ".next",
  experimental: {
    serverActions: { bodySizeLimit: "6mb", allowedOrigins: origin ? [new URL(origin).host] : [] },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
      {
        source: "/driver-account",
        headers: [
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      {
        source: "/passenger/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/track/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};
export default config;
