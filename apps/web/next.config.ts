import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'standalone' output is not needed for Vercel (it handles Next.js natively).
  // If deploying to Docker/self-hosted, uncomment the line below:
  // output: "standalone",
  transpilePackages: ["@mybizos/ui", "@mybizos/shared"],
  experimental: {
    typedEnv: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
};

export default nextConfig;
