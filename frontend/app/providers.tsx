"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain } from "viem";
import { WalletProvider } from "@/lib/wallet-context";
import { useTheme } from "@/lib/theme-context";
import { MEZO_CHAIN_ID, MEZO_IS_TESTNET, MEZO_NETWORK_NAME } from "@/lib/constants";

const mezoChain = defineChain({
  id: MEZO_CHAIN_ID,
  name: MEZO_NETWORK_NAME,
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MEZO_RPC_URL ?? "https://mezo.drpc.org"],
      // Privy's custom-chain docs list a WebSocket RPC as required. Optional
      // here so the app works without one; set it if Privy asks for it.
      ...(process.env.NEXT_PUBLIC_MEZO_WS_URL ? { webSocket: [process.env.NEXT_PUBLIC_MEZO_WS_URL] } : {}),
    },
  },
  blockExplorers: {
    default: { name: "Mezo Explorer", url: process.env.NEXT_PUBLIC_MEZO_EXPLORER_URL ?? "https://explorer.mezo.org" },
  },
  // Multicall3 at its canonical cross-chain address, verified deployed on
  // Mezo mainnet. Declaring it is what lets the `batch.multicall` option on
  // createConfig below aggregate concurrent eth_calls — without this entry
  // viem has no aggregator to route them through and falls back to one
  // request per read.
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
  testnet: MEZO_IS_TESTNET,
});

// Request batching, and it is load-bearing rather than an optimization. A
// list page mounts a dozen-plus useReadContract hooks that all fire at once
// (see lib/use-taskify.ts), and the default keyless dRPC endpoint rejects
// concurrent bursts with HTTP 400 and the misleading body "the method
// eth_call does not exist / is not available" — the method is fine, the
// endpoint is shedding load. Measured against mainnet: 40 concurrent
// eth_calls got 20 rejections, and unbatched reads reproduced that error
// outright.
//
//   batch.multicall  — aggregates concurrent eth_calls into one multicall3
//                      call. 12 concurrent reads measured as 2 HTTP requests
//                      with it on, versus a hard failure with it off.
//   http batch: true — JSON-RPC batching for everything that is not an
//                      eth_call (block number, balances, receipts).
//
// This makes the free endpoint survivable; it does not make it reliable.
// Even sequential requests to it fail intermittently, so the real fix is an
// API-keyed RPC behind a server-side proxy (a key in NEXT_PUBLIC_MEZO_RPC_URL
// would ship to every browser).
const config = createConfig({
  chains: [mezoChain],
  transports: { [mezoChain.id]: http(undefined, { batch: true }) },
  batch: { multicall: true },
  ssr: true,
});

const queryClient = new QueryClient();

// Privy replaces RainbowKit as the connect UI: one modal with email + Google
// (which get an embedded wallet) next to MetaMask / Rabby / WalletConnect.
// Rabby has no dedicated Privy entry any more (rabby_wallet is deprecated);
// it is picked up by detected_ethereum_wallets (EIP-6963 discovery), along
// with any other installed browser wallet.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  if (!PRIVY_APP_ID && typeof window !== "undefined") {
    console.error("NEXT_PUBLIC_PRIVY_APP_ID is not set — wallet login is disabled.");
  }
  return (
    // Privy throws at init on a malformed id, which would 500 every page (and
    // fail prerender) when the env var is absent. A well-formed dummy id keeps
    // the app rendering; login then fails with Privy's own error instead.
    <PrivyProvider
      appId={PRIVY_APP_ID || "c000000000000000000000000"}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: {
          theme: theme === "dark" ? "dark" : "light",
          accentColor: "#ff0044",
          logo: "/logo.jpg",
          showWalletLoginFirst: false,
          walletChainType: "ethereum-only",
          walletList: ["detected_ethereum_wallets", "metamask", "wallet_connect_qr"],
        },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: mezoChain,
        supportedChains: [mezoChain],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <WalletProvider>{children}</WalletProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
