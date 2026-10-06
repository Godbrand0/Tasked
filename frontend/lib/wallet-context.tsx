"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useCreateWallet, usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, MUSD_DECIMALS } from "@/lib/constants";
import { ROLE_ID, roleToString } from "@/lib/taskify";
import { useTaskifyTx, useTaskifyUser } from "@/lib/use-taskify";
import { assertGoogleAvailable } from "@/lib/identity";
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

// Defaults to the real Mezo mainnet MUSD address; override via env for
// testnet or a custom devnet deployment.
const MUSD_ADDRESS = (process.env.NEXT_PUBLIC_MUSD_CONTRACT ?? CONTRACT_ADDRESSES.mainnet.musd) as `0x${string}`;
const MEZO_ADDRESS = (process.env.NEXT_PUBLIC_MEZO_CONTRACT ?? CONTRACT_ADDRESSES.mainnet.mezo) as
  | `0x${string}`
  | undefined;

export interface WalletState {
  connected: boolean;
  address: string;
  /** display_name if set, else the on-chain username. */
  username: string;
  /** Always the raw on-chain username, regardless of any display_name override. */
  onchainUsername: string;
  role: UserRole | null;
  isRegistered: boolean;
  musdBalance: number;
  mezoBalance: number;
  /** Native BTC balance in wei — Mezo's gas token. */
  nativeBalance: bigint;
  /** Exact on-chain token balances (18 decimals) — the number fields above are lossy, so use these for Max/validation. */
  musdRawBalance: bigint;
  mezoRawBalance: bigint;
  refetchTokenBalances: () => Promise<void>;
  /** Whether the connected wallet holds any BTC to pay gas with. */
  hasGas: boolean;
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
  /** Masked address of the wallet this login's Gmail/email is already tied to, when it isn't this one. Null when there's no conflict (or it hasn't been checked). */
  identityConflict: string | null;
  register: (data: {
    username: string;
    role: UserRole;
    experienceLevel: number;
    googleEmail: string;
    googleName?: string;
    googleAvatar?: string;
  }) => Promise<void>;
  /** Re-read the native BTC balance (e.g. after a gas top-up) and return it in wei. */
  refetchNativeBalance: () => Promise<bigint>;
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
  /** Off-chain only — there's no on-chain setUsername. */
  updateDisplayName: (name: string) => Promise<void>;
}

const WalletCtx = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { login, logout, ready, authenticated, user, getAccessToken } = usePrivy();
  const { createWallet } = useCreateWallet();
  const creatingWallet = useRef(false);
  const [identityConflict, setIdentityConflict] = useState<string | null>(null);
  const { send } = useTaskifyTx();

  // After a Privy login, ask the server whether this login's Gmail/email is
  // already linked to a different wallet (see /api/identity/check). Fails open
  // on errors: the unique index on profiles.google_email_normalized is the
  // hard guard for the off-chain record; this is the up-front block.
  useEffect(() => {
    if (!ready || !authenticated || !address) {
      setIdentityConflict(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/identity/check", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ address }),
        });
        if (!res.ok) return;
        const data: { conflict?: boolean; linkedAddress?: string } = await res.json();
        if (!cancelled) setIdentityConflict(data.conflict ? data.linkedAddress ?? "another wallet" : null);
      } catch (err) {
        console.error("[identity-check] failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, address, getAccessToken]);

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
  const [displayName, setDisplayName] = useState("");

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
      setDisplayName("");
      return;
    }
    fetch(`/api/profile?address=${address}`)
      .then((res) => res.json())
      .then((data: { profile?: { github_handle?: string; github_avatar_url?: string; x_handle?: string; x_avatar_url?: string; google_email?: string; google_name?: string; google_avatar_url?: string; custom_avatar_url?: string; display_name?: string } }) => {
        setGithubHandle(data.profile?.github_handle ?? "");
        setGithubAvatar(data.profile?.github_avatar_url ?? "");
        setXHandle(data.profile?.x_handle ?? "");
        setXAvatar(data.profile?.x_avatar_url ?? "");
        setGoogleEmail(data.profile?.google_email ?? "");
        setGoogleName(data.profile?.google_name ?? "");
        setGoogleAvatar(data.profile?.google_avatar_url ?? "");
        setCustomAvatar(data.profile?.custom_avatar_url ?? "");
        setDisplayName(data.profile?.display_name ?? "");
      })
      .catch(() => {});
  }, [address]);

  const { data: musdRaw, refetch: refetchMusd } = useReadContract({
    address: MUSD_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && MUSD_ADDRESS) },
  });

  const { data: mezoRaw, refetch: refetchMezo } = useReadContract({
    address: MEZO_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && MEZO_ADDRESS) },
  });

  const musdBalance = musdRaw !== undefined ? Number(formatUnits(musdRaw as bigint, MUSD_DECIMALS)) : 0;
  const mezoBalance = mezoRaw !== undefined ? Number(formatUnits(mezoRaw as bigint, MUSD_DECIMALS)) : 0;

  const { data: nativeBal, refetch: refetchNativeBal } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: Boolean(address) },
  });
  const nativeBalance = nativeBal?.value ?? BigInt(0);
  const musdRawBalance = (musdRaw as bigint | undefined) ?? BigInt(0);
  const mezoRawBalance = (mezoRaw as bigint | undefined) ?? BigInt(0);
  async function refetchTokenBalances() {
    await Promise.all([refetchMusd(), refetchMezo(), refetchNativeBal()]);
  }
  const hasGas = nativeBalance > BigInt(0);
  async function refetchNativeBalance(): Promise<bigint> {
    const r = await refetchNativeBal();
    return r.data?.value ?? BigInt(0);
  }

  // Signed in to Privy (e.g. Google) but no wallet linked: createOnLogin can
  // leave a user in this state, and calling login() again just warns
  // ("already logged in"). Create the wallet explicitly, and log Privy's real
  // error if it fails — the login modal otherwise sits on "Creating your wallet".
  async function ensureWallet() {
    if (creatingWallet.current) return;
    creatingWallet.current = true;
    try {
      await createWallet({ createAdditional: false });
    } catch (err) {
      console.error("[privy] wallet creation failed:", err);
    } finally {
      creatingWallet.current = false;
    }
  }

  const hasLinkedWallet = Boolean(user?.linkedAccounts.some((a) => a.type === "wallet"));
  useEffect(() => {
    if (!ready || !authenticated || !user || hasLinkedWallet) return;
    const t = setTimeout(() => { void ensureWallet(); }, 4000); // give createOnLogin its chance first
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user?.id, hasLinkedWallet]);

  function handleConnect() {
    if (authenticated) {
      if (!hasLinkedWallet) void ensureWallet();
      return;
    }
    login();
  }

  function handleDisconnect() {
    // Privy ignores wagmi's useDisconnect; logout() ends the Privy session and
    // disconnects the wagmi connector with it.
    void logout();
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
    // Also checked earlier by /register (before the gas top-up); repeated here
    // because registerUser is on-chain and can't be undone.
    await assertGoogleAvailable(data.googleEmail, address);
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

  // Off-chain only, same as linkGithub. The contract has setXVerified /
  // users[].xVerified, but nothing on-chain reads it (joinCommunityTask
  // doesn't check it), so a gas transaction + wallet popup just to attach a
  // social handle isn't worth it — and made linking fragile (it silently
  // no-op'd whenever the on-chain user row hadn't loaded yet). "X verified"
  // for display is derived from either source below, like GitHub.
  async function linkX(handle: string, avatar?: string) {
    if (!address) return;
    setXHandle(handle);
    setXAvatar(avatar ?? "");
    syncProfile(address, { x_handle: handle, x_avatar_url: avatar || null });
  }

  async function unlinkX() {
    if (!address) return;
    setXHandle("");
    setXAvatar("");
    syncProfile(address, { x_handle: null, x_avatar_url: null });
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

  // Off-chain only — Taskify.sol has no setUsername, the on-chain username
  // set at registration is permanent. This overrides it for display
  // purposes wherever the app reads it through this context.
  async function updateDisplayName(name: string) {
    if (!address) return;
    const trimmed = name.trim();
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, display_name: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Failed to update display name");
    setDisplayName(trimmed);
  }

  const value: WalletContextValue = {
    connected: isConnected,
    address: address ?? "",
    musdBalance,
    mezoBalance,
    nativeBalance,
    musdRawBalance,
    mezoRawBalance,
    refetchTokenBalances,
    hasGas,
    refetchNativeBalance,
    // Off-chain display_name overrides the permanent on-chain username for
    // display purposes — see updateDisplayName. onchainUsername always
    // exposes the real on-chain value underneath, for spots that need it
    // specifically (e.g. Settings shows both).
    username: displayName || onchainUser.username,
    onchainUsername: onchainUser.username,
    role: onchainUser.role ? roleToString(onchainUser.role) as UserRole : null,
    isRegistered: onchainUser.role !== 0,
    // GitHub can be linked entirely off-chain post-registration (no
    // setGithubVerified on-chain), so "verified" for display purposes has
    // to check both the on-chain flag (legacy/registration-time) and the
    // off-chain handle (linked later from Settings).
    githubVerified: onchainUser.githubVerified || Boolean(githubHandle),
    // xVerified follows the same either-source rule now that linkX is off-chain.
    githubHandle,
    githubAvatar,
    xVerified: onchainUser.xVerified || Boolean(xHandle),
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
    identityConflict,
    register,
    linkX,
    unlinkX,
    linkGithub,
    unlinkGithub,
    linkGoogle,
    uploadAvatar,
    removeAvatar,
    updateDisplayName,
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
