import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["dripguard-client"],
  turbopack: {},
  serverExternalPackages: ["@stellar/stellar-sdk"],
};

export default nextConfig;
