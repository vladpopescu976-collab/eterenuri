import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Pozele pot veni din bucket-ul propriu (servite prin /api/poze, care
    // pune deja cache de un an) sau dintr-un link extern adaugat de
    // proprietar, deci acceptam orice host https.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Optimizatorul Next (/_next/image) nu se incarca pe runtime-ul Vercel
    // cu Next 16.3 ("Cannot find module .next/server/pages/_next/image.js"),
    // ceea ce rupea toate pozele. Le servim direct, fara redimensionare.
    unoptimized: true,
  },
};

export default nextConfig;
