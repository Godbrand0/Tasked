"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAccount, useDisconnect, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, MUSD_DECIMALS } from "@/lib/constants";
import type { UserRole } from "@/lib/mock";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Defaults to the real Mezo testnet MUSD address; override via env for
// mainnet or a custom devnet deployment. MEZO has no testnet deployment, so
// it's left unset unless NEXT_PUBLIC_MEZO_CONTRACT points at a MockMEZO.
const MUSD_ADDRESS = (process.env.NEXT_PUBLIC_MUSD_CONTRACT ?? CONTRACT_ADDRESSES.testnet.musd) as `0x${string}`;
const MEZO_ADDRESS = process.env.NEXT_PUBLIC_MEZO_CONTRACT as `0x${string}` | undefined;

export interface WalletState {
  connected: boolean;
  address: string;
  username: string;
  role: UserRole | null;
  isRegistered: boolean;
  musdBalance: number;
  mezoBalance: number;
  githubVerified: boolean;
  githubHandle: string;
  xVerified: boolean;
  xHandle: string;
  experienceLevel: number;
  tasksCompleted: number;
  totalEarned: number;
}

interface WalletContextValue extends WalletState {
  connect: () => void;
  disconnect: () => void;
  register: (data: {
    username: string;
    role: UserRole;
    experienceLevel: number;
    githubVerified: boolean;
    githubHandle: string;
    xVerified?: boolean;
    xHandle?: string;
  }) => void;
  linkX: (handle: string) => void;
  unlinkX: () => void;
}

const WalletCtx = createContext<WalletContextValue | null>(null);

interface Profile {
  username: string;
  role: UserRole | null;
  isRegistered: boolean;
  githubVerified: boolean;
  githubHandle: string;
  xVerified: boolean;
  xHandle: string;
  experienceLevel: number;
  tasksCompleted: number;
  totalEarned: number;
}

const EMPTY_PROFILE: Profile = {
  username: "",
  role: null,
  isRegistered: false,
  githubVerified: false,
  githubHandle: "",
  xVerified: false,
  xHandle: "",
  experienceLevel: 0,
  tasksCompleted: 0,
  totalEarned: 0,
};

// Registration profile is app-level state today (in prod this reads from
// registerUser/getUser on the Taskify contract). Persisted per-address so a
// reconnect doesn't lose it.
const STORAGE_PREFIX = "taskify:profile:";

function loadProfile(address: string): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + address);
    return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

function saveProfile(address: string, profile: Profile) {
  try {
    localStorage.setItem(STORAGE_PREFIX + address, JSON.stringify(profile));
  } catch {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  useEffect(() => {
    setProfile(address ? loadProfile(address) : EMPTY_PROFILE);
  }, [address]);

  const { data: musdRaw } = useReadContract({
    address: MUSD_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && MUSD_ADDRESS) },
  });

  const { data: mezoRaw } = useReadContract({
    address: MEZO_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && MEZO_ADDRESS) },
  });

  const musdBalance = musdRaw !== undefined ? Number(formatUnits(musdRaw as bigint, MUSD_DECIMALS)) : 0;
  const mezoBalance = mezoRaw !== undefined ? Number(formatUnits(mezoRaw as bigint, MUSD_DECIMALS)) : 0;

  function handleConnect() {
    openConnectModal?.();
  }

  function handleDisconnect() {
    wagmiDisconnect();
  }

  function register(data: {
    username: string;
    role: UserRole;
    experienceLevel: number;
    githubVerified: boolean;
    githubHandle: string;
    xVerified?: boolean;
    xHandle?: string;
  }) {
    if (!address) return;
    const next: Profile = {
      ...data,
      xVerified: data.xVerified ?? false,
      xHandle: data.xHandle ?? "",
      isRegistered: true,
      tasksCompleted: 0,
      totalEarned: 0,
    };
    setProfile(next);
    saveProfile(address, next);
  }

  // Independent of role and callable any time after registration — mirrors
  // Taskify.sol's setXVerified, which gates Community task participation
  // without requiring re-registration.
  function linkX(handle: string) {
    if (!address || !profile.isRegistered) return;
    const next: Profile = { ...profile, xVerified: true, xHandle: handle };
    setProfile(next);
    saveProfile(address, next);
  }

  function unlinkX() {
    if (!address || !profile.isRegistered) return;
    const next: Profile = { ...profile, xVerified: false, xHandle: "" };
    setProfile(next);
    saveProfile(address, next);
  }

  const value: WalletContextValue = {
    connected: isConnected,
    address: address ?? "",
    musdBalance,
    mezoBalance,
    ...profile,
    connect: handleConnect,
    disconnect: handleDisconnect,
    register,
    linkX,
    unlinkX,
  };

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
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

export function formatBalance(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
