import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // RainbowKit's default wallet list statically references a Coinbase Wallet
  // connector that pulls in @coinbase/cdp-sdk purely for an x402 paid-API
  // flow we never use (we build our own explicit wallet list without it —
  // see app/providers.tsx). That package's x402 code imports several
  // @x402/* packages we don't install, which breaks resolution. Stubbing
  // just @coinbase/cdp-sdk avoids the whole unreachable subtree.
  turbopack: {
    resolveAlias: {
      "@coinbase/cdp-sdk": "./lib/stubs/coinbase-cdp-sdk.ts",
    },
  },
};

export default nextConfig;
