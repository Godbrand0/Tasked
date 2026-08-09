"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAccount, useDisconnect, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, MUSD_DECIMALS } from "@/lib/constants";
import { ROLE_ID, roleToString } from "@/lib/taskify";
import { useTaskifyTx, useTaskifyUser } from "@/lib/use-taskify";
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
// mainnet or a custom devnet deployment.
const MUSD_ADDRESS = (process.env.NEXT_PUBLIC_MUSD_CONTRACT ?? CONTRACT_ADDRESSES.testnet.musd) as `0x${string}`;
const MEZO_ADDRESS = (process.env.NEXT_PUBLIC_MEZO_CONTRACT ?? CONTRACT_ADDRESSES.testnet.mezo) as
  | `0x${string}`
  | undefined;

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
  githubAvatar: string;
  xVerified: boolean;
  xHandle: string;
  xAvatar: string;
  /** githubAvatar if connected, else xAvatar — for UI spots that only show one avatar. */
  avatarUrl: string;
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
    githubAvatar?: string;
    xVerified?: boolean;
    xHandle?: string;
    xAvatar?: string;
  }) => Promise<void>;
  linkX: (handle: string, avatar?: string) => Promise<void>;
  unlinkX: () => Promise<void>;
}

const WalletCtx = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { send } = useTaskifyTx();

  const { user: onchainUser, refetch: refetchUser } = useTaskifyUser(address);
  // githubHandle/xHandle display info (avatar, verified flags) lives off-chain
  // in Supabase's profiles table — the contract only stores the username
  // string and a self-declared xVerified bool. Merged in below.
  const [githubHandle, setGithubHandle] = useState("");
  const [githubAvatar, setGithubAvatar] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [xAvatar, setXAvatar] = useState("");

  useEffect(() => {
    if (!address) {
      setGithubHandle("");
      setGithubAvatar("");
      setXHandle("");
      setXAvatar("");
      return;
    }
    fetch(`/api/profile?address=${address}`)
      .then((res) => res.json())
      .then((data: { profile?: { github_handle?: string; github_avatar_url?: string; x_handle?: string; x_avatar_url?: string } }) => {
        setGithubHandle(data.profile?.github_handle ?? "");
        setGithubAvatar(data.profile?.github_avatar_url ?? "");
        setXHandle(data.profile?.x_handle ?? "");
        setXAvatar(data.profile?.x_avatar_url ?? "");
      })
      .catch(() => {});
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

  // Best-effort sync to the off-chain profiles table (bio, linked-handle
  // display info — see supabase/schema.sql). Fire-and-forget: the on-chain
  // read stays the source of truth for role/registration regardless of
  // whether this succeeds, so a flaky network call never blocks anything.
  function syncProfile(addr: string, fields: Record<string, unknown>) {
    fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addr, ...fields }),
    }).catch(() => {});
  }

  // Calls registerUser on-chain and waits for confirmation. Throws on
  // failure (rejected tx, wallet cancellation) so callers can surface the
  // error instead of optimistically assuming success.
  async function register(data: {
    username: string;
    role: UserRole;
    experienceLevel: number;
    githubVerified: boolean;
    githubHandle: string;
    githubAvatar?: string;
    xVerified?: boolean;
    xHandle?: string;
    xAvatar?: string;
  }) {
    if (!address) throw new Error("No wallet connected");
    await send("registerUser", [
      data.username,
      ROLE_ID[data.role],
      data.experienceLevel,
      data.githubVerified,
      data.xVerified ?? false,
    ]);
    setGithubHandle(data.githubHandle);
    setGithubAvatar(data.githubAvatar ?? "");
    setXHandle(data.xHandle ?? "");
    setXAvatar(data.xAvatar ?? "");
    syncProfile(address, {
      github_handle: data.githubHandle || null,
      github_avatar_url: data.githubAvatar || null,
      x_handle: data.xHandle || null,
      x_avatar_url: data.xAvatar || null,
    });
    await refetchUser();
  }

  // Independent of role and callable any time after registration — mirrors
  // Taskify.sol's setXVerified, which gates Community task participation
  // without requiring re-registration.
  async function linkX(handle: string, avatar?: string) {
    if (!address || !onchainUser.role) return;
    await send("setXVerified", [true]);
    setXHandle(handle);
    setXAvatar(avatar ?? "");
    syncProfile(address, { x_handle: handle, x_avatar_url: avatar || null });
    await refetchUser();
  }

  async function unlinkX() {
    if (!address || !onchainUser.role) return;
    await send("setXVerified", [false]);
    setXHandle("");
    setXAvatar("");
    syncProfile(address, { x_handle: null, x_avatar_url: null });
    await refetchUser();
  }

  const value: WalletContextValue = {
    connected: isConnected,
    address: address ?? "",
    musdBalance,
    mezoBalance,
    username: onchainUser.username,
    role: onchainUser.role ? roleToString(onchainUser.role) as UserRole : null,
    isRegistered: onchainUser.role !== 0,
    githubVerified: onchainUser.githubVerified,
    githubHandle,
    githubAvatar,
    xVerified: onchainUser.xVerified,
    xHandle,
    xAvatar,
    avatarUrl: githubAvatar || xAvatar,
    experienceLevel: onchainUser.experienceLevel,
    tasksCompleted: onchainUser.tasksCompleted,
    totalEarned: Number(formatUnits(onchainUser.totalEarned, MUSD_DECIMALS)),
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
