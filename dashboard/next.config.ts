import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure turbopack uses this folder as the root to pick up the right CSS/Tailwind
    turbopack: {
      root: __dirname,
    },
  },
};

export default nextConfig;
