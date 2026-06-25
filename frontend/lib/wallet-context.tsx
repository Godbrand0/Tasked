"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { connect, disconnect as stacksDisconnect } from "@stacks/connect";
import type { UserRole } from "@/lib/mock";

export interface WalletState {
  connected: boolean;
  address: string;
  username: string;
  role: UserRole | null;
  isRegistered: boolean;
  usdxBalance: number;
  stxBalance: number;
  githubVerified: boolean;
  githubHandle: string;
  experienceLevel: number;
  tasksCompleted: number;
  totalEarned: number;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  register: (data: {
    username: string;
    role: UserRole;
    experienceLevel: number;
    githubVerified: boolean;
    githubHandle: string;
  }) => void;
}

const WalletCtx = createContext<WalletContextValue | null>(null);

const EMPTY: WalletState = {
  connected: false,
  address: "",
  username: "",
  role: null,
  isRegistered: false,
  usdxBalance: 0,
  stxBalance: 0,
  githubVerified: false,
  githubHandle: "",
  experienceLevel: 0,
  tasksCompleted: 0,
  totalEarned: 0,
};

const STORAGE_KEY = "tasked:wallet";

function persist(data: WalletState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

async function fetchStxBalance(address: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.hiro.so/extended/v1/address/${address}/balances`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return parseInt(data?.stx?.balance ?? "0", 10);
  } catch {
    return 0;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(EMPTY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: WalletState = JSON.parse(raw);
        setWallet(saved);
        // Refresh balance in background
        if (saved.connected && saved.address) {
          fetchStxBalance(saved.address).then(stxBalance => {
            setWallet(w => {
              const next = { ...w, stxBalance };
              persist(next);
              return next;
            });
          });
        }
      }
    } catch {}
  }, []);

  async function handleConnect() {
    try {
      const result = await connect({ forceWalletSelect: true });

      // Find the STX address — wallets return both BTC and STX addresses
      const stxEntry =
        result.addresses.find(a => a.symbol === "STX") ??
        result.addresses.find(a => /^S[PTM]/.test(a.address));

      if (!stxEntry) return;

      const address = stxEntry.address;
      const stxBalance = await fetchStxBalance(address);

      setWallet(prev => {
        const next: WalletState = {
          ...prev,
          connected: true,
          address,
          stxBalance,
          usdxBalance: 0,
        };
        persist(next);
        return next;
      });
    } catch {
      // User closed the wallet picker — do nothing
    }
  }

  function handleDisconnect() {
    try {
      stacksDisconnect();
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setWallet(EMPTY);
  }

  function register(data: {
    username: string;
    role: UserRole;
    experienceLevel: number;
    githubVerified: boolean;
    githubHandle: string;
  }) {
    setWallet(prev => {
      const next: WalletState = { ...prev, ...data, isRegistered: true };
      persist(next);
      return next;
    });
  }

  return (
    <WalletCtx.Provider
      value={{ ...wallet, connect: handleConnect, disconnect: handleDisconnect, register }}
    >
      {children}
    </WalletCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}

export function formatAddress(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatBalance(micro: number) {
  return (micro / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
