import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Proprietarii adaugă pozele prin link, deci sursa poate fi orice host https.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
