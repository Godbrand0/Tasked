"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain } from "viem";
import { WalletProvider } from "@/lib/wallet-context";

// Mezo testnet params, verified against mezo.org/docs/users/getting-started/connect
// (2026-08-09). Override via env for a custom RPC or to point at mainnet.
const mezoTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MEZO_CHAIN_ID ?? 31611),
  name: "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MEZO_RPC_URL ?? "https://rpc.test.mezo.org"] },
  },
  blockExplorers: {
    default: { name: "Mezo Explorer", url: process.env.NEXT_PUBLIC_MEZO_EXPLORER_URL ?? "https://explorer.test.mezo.org" },
  },
  testnet: true,
});

// Explicit wallet list (skipping RainbowKit's default Coinbase Wallet entry —
// its connector pulls in @coinbase/cdp-sdk's x402 payment code, which drags
// in a chain of optional packages we don't use and that break the build).
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rabbyWallet, rainbowWallet, walletConnectWallet, injectedWallet],
    },
  ],
  {
    appName: "Taskify",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "taskify-dev",
  }
);

const config = createConfig({
  connectors,
  chains: [mezoTestnet],
  transports: { [mezoTestnet.id]: http() },
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "var(--primary)", accentColorForeground: "var(--bg)" })}>
          <WalletProvider>{children}</WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
