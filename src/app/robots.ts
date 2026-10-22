import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/track",
        "/passenger",
        "/api",
        "/admin",
        "/login",
        "/auth",
        "/reset-password",
        "/update-password",
        "/access-pending",
        "/driver-account",
      ],
    },
  };
}
