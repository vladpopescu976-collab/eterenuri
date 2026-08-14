import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracing: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;


