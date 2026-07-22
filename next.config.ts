import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack rooted on this app (not parent EBAY/)
  turbopack: {
    root: process.cwd(),
  },
  // Official eBay Event Notification SDK is CommonJS — keep it external on the server.
  serverExternalPackages: [
    "event-notification-nodejs-sdk",
    "ebay-oauth-nodejs-client",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
