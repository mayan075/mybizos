import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mybizos/ui", "@mybizos/shared"],
  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
