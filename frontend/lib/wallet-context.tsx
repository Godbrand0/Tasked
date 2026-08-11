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
  googleVerified: boolean;
  googleEmail: string;
  googleName: string;
  googleAvatar: string;
  customAvatar: string;
  /** customAvatar if uploaded, else googleAvatar, else githubAvatar, else xAvatar — for UI spots that only show one avatar. */
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
    googleEmail: string;
    googleName?: string;
    googleAvatar?: string;
  }) => Promise<void>;
  linkX: (handle: string, avatar?: string) => Promise<void>;
  unlinkX: () => Promise<void>;
  /** Off-chain only — there's no on-chain setGithubVerified, unlike X's setXVerified. */
  linkGithub: (handle: string, avatar?: string) => Promise<void>;
  unlinkGithub: () => Promise<void>;
  /** Off-chain only — for legacy accounts registered before Google existed. */
  linkGoogle: (email: string, name?: string, avatar?: string) => Promise<void>;
  /** Off-chain only — dataUrl from a client-side FileReader read, capped at ~1.5MB server-side. */
  uploadAvatar: (dataUrl: string) => Promise<void>;
  removeAvatar: () => Promise<void>;
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
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleAvatar, setGoogleAvatar] = useState("");
  const [customAvatar, setCustomAvatar] = useState("");

  useEffect(() => {
    if (!address) {
      setGithubHandle("");
      setGithubAvatar("");
      setXHandle("");
      setXAvatar("");
      setGoogleEmail("");
      setGoogleName("");
      setGoogleAvatar("");
      setCustomAvatar("");
      return;
    }
    fetch(`/api/profile?address=${address}`)
      .then((res) => res.json())
      .then((data: { profile?: { github_handle?: string; github_avatar_url?: string; x_handle?: string; x_avatar_url?: string; google_email?: string; google_name?: string; google_avatar_url?: string; custom_avatar_url?: string } }) => {
        setGithubHandle(data.profile?.github_handle ?? "");
        setGithubAvatar(data.profile?.github_avatar_url ?? "");
        setXHandle(data.profile?.x_handle ?? "");
        setXAvatar(data.profile?.x_avatar_url ?? "");
        setGoogleEmail(data.profile?.google_email ?? "");
        setGoogleName(data.profile?.google_name ?? "");
        setGoogleAvatar(data.profile?.google_avatar_url ?? "");
        setCustomAvatar(data.profile?.custom_avatar_url ?? "");
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
    googleEmail: string;
    googleName?: string;
    googleAvatar?: string;
  }) {
    if (!address) throw new Error("No wallet connected");
    // GitHub/X are no longer collected at registration — both on-chain
    // flags start false; linkGithub/linkX set them (or the off-chain
    // equivalent) afterward, from Settings.
    await send("registerUser", [data.username, ROLE_ID[data.role], data.experienceLevel, false, false]);
    setGoogleEmail(data.googleEmail);
    setGoogleName(data.googleName ?? "");
    setGoogleAvatar(data.googleAvatar ?? "");
    syncProfile(address, {
      google_email: data.googleEmail || null,
      google_name: data.googleName || null,
      google_avatar_url: data.googleAvatar || null,
      // Google already hands over a verified email — use it as the
      // notification email automatically instead of asking again at
      // registration. Editable/removable later from Settings.
      email: data.googleEmail || null,
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

  // GitHub has no on-chain setGithubVerified (unlike X) — the on-chain flag
  // is only ever set at registration time, and stays whatever it was set to
  // then. A post-registration link is purely off-chain; "verified" status
  // for display purposes is derived below from either source.
  async function linkGithub(handle: string, avatar?: string) {
    if (!address) return;
    setGithubHandle(handle);
    setGithubAvatar(avatar ?? "");
    syncProfile(address, { github_handle: handle, github_avatar_url: avatar || null });
  }

  async function unlinkGithub() {
    if (!address) return;
    setGithubHandle("");
    setGithubAvatar("");
    syncProfile(address, { github_handle: null, github_avatar_url: null });
  }

  // Off-chain only, same as linkGithub — for accounts registered before
  // Google became the required identity, linking it after the fact from
  // Settings rather than at registration time.
  async function linkGoogle(email: string, name?: string, avatar?: string) {
    if (!address) return;
    setGoogleEmail(email);
    setGoogleName(name ?? "");
    setGoogleAvatar(avatar ?? "");
    syncProfile(address, { google_email: email, google_name: name || null, google_avatar_url: avatar || null });
  }

  // Unlike the other link* functions this is awaited and can throw — the
  // server enforces a size cap on custom_avatar_url (see app/api/profile),
  // so the caller (Settings) needs a real error, not a silent no-op.
  async function uploadAvatar(dataUrl: string) {
    if (!address) return;
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, custom_avatar_url: dataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Failed to upload profile picture");
    setCustomAvatar(dataUrl);
  }

  async function removeAvatar() {
    if (!address) return;
    setCustomAvatar("");
    syncProfile(address, { custom_avatar_url: null });
  }

  const value: WalletContextValue = {
    connected: isConnected,
    address: address ?? "",
    musdBalance,
    mezoBalance,
    username: onchainUser.username,
    role: onchainUser.role ? roleToString(onchainUser.role) as UserRole : null,
    isRegistered: onchainUser.role !== 0,
    // GitHub can be linked entirely off-chain post-registration (no
    // setGithubVerified on-chain), so "verified" for display purposes has
    // to check both the on-chain flag (legacy/registration-time) and the
    // off-chain handle (linked later from Settings).
    githubVerified: onchainUser.githubVerified || Boolean(githubHandle),
    githubHandle,
    githubAvatar,
    xVerified: onchainUser.xVerified,
    xHandle,
    xAvatar,
    googleVerified: Boolean(googleEmail),
    googleEmail,
    googleName,
    googleAvatar,
    customAvatar,
    avatarUrl: customAvatar || googleAvatar || githubAvatar || xAvatar,
    experienceLevel: onchainUser.experienceLevel,
    tasksCompleted: onchainUser.tasksCompleted,
    totalEarned: Number(formatUnits(onchainUser.totalEarned, MUSD_DECIMALS)),
    connect: handleConnect,
    disconnect: handleDisconnect,
    register,
    linkX,
    unlinkX,
    linkGithub,
    unlinkGithub,
    linkGoogle,
    uploadAvatar,
    removeAvatar,
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
