"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Avatar from "@/components/ui/Avatar";
import { Badge, TierBadge } from "@/components/ui/Badge";
import { TIERS, ROLE_LABELS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";
import { TASKIFY_ADDRESS } from "@/lib/taskify";
import { useAllTasks, useTaskifyTx } from "@/lib/use-taskify";
import { formatContractError } from "@/lib/errors";

const DEFAULT_NOTIFS = { task_assigned: true, work_submitted: true, funds_released: true, grant_vote_opened: true, wave_reward_ready: true, task_applied: true, community_task_joined: true, task_comment: true, comment_reply: true };
type NotifKey = keyof typeof DEFAULT_NOTIFS;

const NOTIF_ITEMS: { key: NotifKey; label: string; desc: string }[] = [
  { key: "task_applied",          label: "New Applicant",     desc: "When someone applies to your task" },
  { key: "community_task_joined", label: "Community Join",    desc: "When someone joins your community task" },
  { key: "task_assigned",         label: "Task Assigned",     desc: "When an owner assigns you to a task" },
  { key: "work_submitted",        label: "Work Submitted",    desc: "When a contributor submits work on your task" },
  { key: "funds_released",        label: "Funds Released",    desc: "When MUSD is released to your wallet" },
  { key: "task_comment",          label: "New Comment",       desc: "When someone comments on your task" },
  { key: "comment_reply",         label: "Comment Reply",     desc: "When someone replies to your comment" },
  { key: "grant_vote_opened",     label: "Grant Vote Opened", desc: "When a new grant application enters voting" },
  { key: "wave_reward_ready",     label: "Wave Reward Ready", desc: "When a wave ends and your reward is claimable" },
];

type Section = "profile" | "experience" | "notifications" | "wallet" | "danger";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",       icon: "👤" },
  { id: "experience",    label: "Experience",    icon: "🏅" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "wallet",        label: "Wallet",        icon: "🔐" },
  { id: "danger",        label: "Danger Zone",   icon: "⚠️" },
];

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const {
    username, onchainUsername, role, experienceLevel,
    githubVerified, githubHandle, linkGithub, unlinkGithub,
    xVerified, xHandle, linkX, unlinkX,
    googleVerified, googleEmail, googleName, linkGoogle,
    avatarUrl, customAvatar, uploadAvatar, removeAvatar, updateDisplayName,
  } = useWallet();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { send } = useTaskifyTx();
  const { data: onchainTasks } = useAllTasks();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<Section>("profile");
  const [usernameInput, setUsernameInput] = useState(username);
  const [bio, setBio] = useState("");
  const [expTier, setExpTier] = useState(experienceLevel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [notifs, setNotifs] = useState<typeof DEFAULT_NOTIFS>(DEFAULT_NOTIFS);
  const [email, setEmail] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [xConnecting, setXConnecting] = useState(false);
  const [xError, setXError] = useState("");
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => setExpTier(experienceLevel), [experienceLevel]);
  useEffect(() => setUsernameInput(username), [username]);

  // Completes the X OAuth flow: the callback route redirects back here with
  // the verified handle in the query string, then we sign setXVerified(true)
  // on-chain with that real handle.
  useEffect(() => {
    const handle = searchParams.get("x_handle");
    const avatar = searchParams.get("x_avatar");
    const error = searchParams.get("x_error");
    if (handle) {
      window.history.replaceState({}, "", "/settings");
      setXConnecting(true);
      setXError("");
      linkX(handle, avatar ?? undefined).catch((err) => {
        setXError(formatContractError(err, "Failed to link X on-chain"));
      }).finally(() => setXConnecting(false));
    }
    if (error) {
      window.history.replaceState({}, "", "/settings");
      setXError("X connection failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleXConnect() {
    setXError("");
    window.location.href = "/api/auth/x?return_to=%2Fsettings";
  }

  // Completes the GitHub OAuth flow — off-chain only, no on-chain call.
  useEffect(() => {
    const handle = searchParams.get("github_handle");
    const avatar = searchParams.get("github_avatar");
    const error = searchParams.get("github_error");
    if (handle) {
      window.history.replaceState({}, "", "/settings");
      setGithubConnecting(true);
      setGithubError("");
      linkGithub(handle, avatar ?? undefined).catch((err) => {
        setGithubError(formatContractError(err, "Failed to link GitHub"));
      }).finally(() => setGithubConnecting(false));
    }
    if (error) {
      window.history.replaceState({}, "", "/settings");
      setGithubError("GitHub connection failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleGithubConnect() {
    setGithubError("");
    window.location.href = "/api/auth/github";
  }

  // Completes the Google OAuth flow — off-chain only, for accounts
  // registered before Google became the required identity.
  useEffect(() => {
    const email = searchParams.get("google_email");
    const name = searchParams.get("google_name");
    const avatar = searchParams.get("google_avatar");
    const error = searchParams.get("google_error");
    if (email) {
      window.history.replaceState({}, "", "/settings");
      setGoogleConnecting(true);
      setGoogleError("");
      linkGoogle(email, name ?? undefined, avatar ?? undefined).catch((err) => {
        setGoogleError(formatContractError(err, "Failed to link Google"));
      }).finally(() => setGoogleConnecting(false));
    }
    if (error) {
      window.history.replaceState({}, "", "/settings");
      setGoogleError("Google connection failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleGoogleConnect() {
    setGoogleError("");
    window.location.href = "/api/auth/google?return_to=%2Fsettings";
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setAvatarError("Image is too large — please choose one under 1.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUploading(true);
      uploadAvatar(reader.result as string)
        .catch((err) => setAvatarError(formatContractError(err, "Failed to upload")))
        .finally(() => setAvatarUploading(false));
    };
    reader.onerror = () => setAvatarError("Failed to read image file.");
    reader.readAsDataURL(file);
  }

  const myOpenSelfFundedTasks = useMemo(
    () => (onchainTasks ?? []).filter(
      t => address && t.creator.toLowerCase() === address.toLowerCase() && t.status === 1 && t.fundingType === 0
    ),
    [onchainTasks, address]
  );

  async function handleCancelAll() {
    setCancelling(true);
    setCancelError("");
    try {
      for (const t of myOpenSelfFundedTasks) {
        await send("cancelTask", [BigInt(t.id)]);
      }
    } catch (err) {
      setCancelError(formatContractError(err, "Failed to cancel one or more tasks"));
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    if (!address) return;
    fetch(`/api/profile?address=${address}`)
      .then(res => res.json())
      .then((data: { profile: { bio?: string; email?: string; notification_prefs?: Partial<typeof DEFAULT_NOTIFS> } | null }) => {
        if (!data.profile) return;
        if (typeof data.profile.bio === "string") setBio(data.profile.bio);
        if (typeof data.profile.email === "string") setEmail(data.profile.email);
        if (data.profile.notification_prefs) setNotifs(n => ({ ...n, ...data.profile!.notification_prefs }));
      })
      .catch(() => setLoadError("Couldn't load saved settings."));
  }, [address]);

  async function handleSave() {
    if (!address) return;
    setSaving(true);
    setSaveError("");
    try {
      if (active === "profile") {
        if (usernameInput.trim().length === 0) throw new Error("Username can't be empty.");
        if (usernameInput.trim().length > 32) throw new Error("Username is too long (max 32 chars).");
        await updateDisplayName(usernameInput.trim());
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, bio }),
        });
      } else if (active === "notifications") {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, notification_prefs: notifs, email }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      } else if (active === "experience" && expTier !== experienceLevel) {
        await send("updateExperience", [expTier]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(formatContractError(err, "Failed to save — check the 1-day cooldown on experience updates."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", margin: loadError ? "0 0 8px" : "0 0 36px" }}>Manage your profile, experience tier, and notification preferences.</p>
        {loadError && <p style={{ fontSize: 13, color: "var(--danger)", margin: "0 0 28px" }}>{loadError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]" style={{ gap: 28, alignItems: "start" }}>
          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 80 }}>
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ background: active === s.id ? "color-mix(in srgb, var(--primary) 9%, transparent)" : "transparent", border: `1px solid ${active === s.id ? "color-mix(in srgb, var(--primary) 19%, transparent)" : "transparent"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 14, color: active === s.id ? "var(--primary)" : "var(--text-muted)", fontWeight: active === s.id ? 600 : 400, textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32 }}>

            {/* Profile */}
            {active === "profile" && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 24px" }}>Profile</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                  <div style={{ position: "relative" }}>
                    <Avatar src={avatarUrl} alt={username || address || ""} size={60} radius={16} fontSize={24} gradient="linear-gradient(135deg, var(--primary), var(--secondary))" />
                    <label style={{ position: "absolute", bottom: -4, right: -4, width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", border: "2px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: avatarUploading ? "not-allowed" : "pointer", opacity: avatarUploading ? 0.6 : 1 }}>
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} style={{ display: "none" }} />
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </label>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{username || address}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge color={role === "creator" ? "orange" : role === "contributor" ? "purple" : "green"}>
                        {role ? ROLE_LABELS[role] : "Unregistered"}
                      </Badge>
                      {githubVerified && <Badge color="green">GitHub Verified</Badge>}
                    </div>
                    {customAvatar && (
                      <button onClick={() => removeAvatar().catch(() => {})} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 6, textDecoration: "underline" }}>
                        Remove custom picture
                      </button>
                    )}
                  </div>
                </div>
                {avatarUploading && <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}>Uploading…</div>}
                {avatarError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 16 }}>{avatarError}</div>}
                <div style={{ marginBottom: 16 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Username</label>
                    <input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} maxLength={32} placeholder={onchainUsername}
                      style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                      onFocus={(e) => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                      Changes how you're shown across the app. Your on-chain identity (<code style={{ fontFamily: "var(--font-geist-mono)" }}>{onchainUsername}</code>) never changes — Taskify.sol has no update function for it.
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Bio <span style={{ fontWeight: 400 }}>(optional)</span></label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the community about yourself..." rows={3}
                      style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }}
                      onFocus={(e) => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Google <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(your Taskify identity)</span></div>
                        <div style={{ fontSize: 12, color: googleVerified ? "var(--success)" : "var(--text-dim)" }}>
                          {googleConnecting ? "Connecting…" : googleVerified ? (googleName || googleEmail) : "Not connected"}
                        </div>
                      </div>
                    </div>
                    {!googleVerified && (
                      <button onClick={handleGoogleConnect} disabled={googleConnecting}
                        style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: googleConnecting ? "not-allowed" : "pointer", opacity: googleConnecting ? 0.7 : 1, whiteSpace: "nowrap" }}>
                        {googleConnecting ? "Connecting…" : "Continue with Google"}
                      </button>
                    )}
                  </div>
                  {googleError && <div style={{ fontSize: 12, color: "var(--danger)" }}>{googleError}</div>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>GitHub <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(optional — for Development task credibility)</span></div>
                        <div style={{ fontSize: 12, color: githubVerified ? "var(--success)" : "var(--text-dim)" }}>
                          {githubConnecting ? "Connecting…" : githubVerified ? `@${githubHandle || onchainUsername}` : "Not connected"}
                        </div>
                      </div>
                    </div>
                    {githubVerified ? (
                      <button onClick={unlinkGithub} style={{ background: "var(--border)", border: "1px solid var(--border)", color: "var(--text-dim)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                        Disconnect
                      </button>
                    ) : (
                      <button onClick={handleGithubConnect} disabled={githubConnecting}
                        style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: githubConnecting ? "not-allowed" : "pointer", opacity: githubConnecting ? 0.7 : 1, whiteSpace: "nowrap" }}>
                        {githubConnecting ? "Connecting…" : "Continue with GitHub"}
                      </button>
                    )}
                  </div>
                  {githubError && <div style={{ fontSize: 12, color: "var(--danger)" }}>{githubError}</div>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>X <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(optional)</span></div>
                        <div style={{ fontSize: 12, color: xVerified ? "var(--success)" : "var(--text-dim)" }}>
                          {xConnecting ? "Verifying…" : xVerified ? `@${xHandle}` : "Not connected"}
                        </div>
                      </div>
                    </div>
                    {xVerified ? (
                      <button onClick={unlinkX} style={{ background: "var(--border)", border: "1px solid var(--border)", color: "var(--text-dim)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                        Disconnect
                      </button>
                    ) : (
                      <button onClick={handleXConnect} disabled={xConnecting}
                        style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: xConnecting ? "not-allowed" : "pointer", opacity: xConnecting ? 0.7 : 1, whiteSpace: "nowrap" }}>
                        {xConnecting ? "Connecting…" : "Continue with X"}
                      </button>
                    )}
                  </div>
                  {xError && <div style={{ fontSize: 12, color: "var(--danger)" }}>{xError}</div>}
                </div>
              </div>
            )}

            {/* Experience */}
            {active === "experience" && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Experience Level</h2>
                <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 24px", lineHeight: 1.6 }}>
                  Your experience tier is stored on-chain and gates which tasks you can apply to. Updates cost a small gas fee and have a ~1 day cooldown.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {TIERS.map((tier) => (
                    <button key={tier.id} onClick={() => setExpTier(tier.id)}
                      style={{ background: expTier === tier.id ? tier.bg : "var(--surface-2)", border: `1px solid ${expTier === tier.id ? tier.color + "50" : "var(--border)"}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: tier.bg, border: `1px solid ${tier.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: tier.color }}>{tier.id}</div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{tier.label}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{tier.years}</div>
                        </div>
                      </div>
                      {expTier === tier.id && <span style={{ color: tier.color, fontSize: 16 }}>✓</span>}
                    </button>
                  ))}
                </div>
                {expTier !== experienceLevel && (
                  <div style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 13%, transparent)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Changing from <strong style={{ color: "var(--text)" }}>{TIERS[experienceLevel].label}</strong> to <strong style={{ color: TIERS[expTier].color }}>{TIERS[expTier].label}</strong>. This calls <code style={{ color: "var(--primary)", fontSize: 11 }}>updateExperience</code> on-chain.
                  </div>
                )}
              </div>
            )}

            {/* Notifications */}
            {active === "notifications" && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Notifications</h2>
                <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 24px" }}>Choose which on-chain events trigger notifications.</p>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                    Email <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(optional — also sends the events below by email)</span>
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                    onFocus={(e) => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {NOTIF_ITEMS.map(({ key, label, desc }, i) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: i < NOTIF_ITEMS.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{label}</div>
                        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{desc}</div>
                      </div>
                      <button onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))}
                        style={{ width: 44, height: 24, borderRadius: 12, background: notifs[key] ? "var(--primary)" : "var(--border)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: notifs[key] ? 23 : 3, transition: "left 0.2s" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wallet */}
            {active === "wallet" && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 24px" }}>Wallet</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 8 }}>Connected Address</div>
                    <div style={{ fontSize: 14, color: "var(--text)", fontFamily: "var(--font-geist-mono)", wordBreak: "break-all" }}>{address}</div>
                  </div>
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 8 }}>Network</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
                      <div style={{ fontSize: 14, color: "var(--text)" }}>Mezo Testnet</div>
                    </div>
                  </div>
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 8 }}>Contract</div>
                    <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)", wordBreak: "break-all" }}>{TASKIFY_ADDRESS ?? "not configured"}</div>
                  </div>
                  <button onClick={() => disconnect()} style={{ background: "color-mix(in srgb, var(--danger-strong) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-strong) 19%, transparent)", color: "var(--danger)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, cursor: "pointer", marginTop: 4 }}>
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            )}

            {/* Danger zone */}
            {active === "danger" && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--danger)", margin: "0 0 8px" }}>Danger Zone</h2>
                <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 24px", lineHeight: 1.6 }}>These actions are irreversible. On-chain data cannot be deleted.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "color-mix(in srgb, var(--danger-strong) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-strong) 19%, transparent)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Cancel All Open Tasks</div>
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>Refunds escrowed MUSD for all {myOpenSelfFundedTasks.length} of your open self-funded tasks. Cannot be undone.</div>
                    <button disabled={cancelling || myOpenSelfFundedTasks.length === 0} onClick={handleCancelAll} style={{ background: "color-mix(in srgb, var(--danger-strong) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-strong) 19%, transparent)", color: "var(--danger)", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, cursor: (cancelling || myOpenSelfFundedTasks.length === 0) ? "not-allowed" : "pointer", opacity: (cancelling || myOpenSelfFundedTasks.length === 0) ? 0.6 : 1 }}>
                      {cancelling ? "Cancelling…" : `Cancel ${myOpenSelfFundedTasks.length || "All"} Open Task${myOpenSelfFundedTasks.length !== 1 ? "s" : ""}`}
                    </button>
                    {cancelError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>{cancelError}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            {(active === "profile" || active === "experience" || active === "notifications") && (
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                {saveError && <div style={{ fontSize: 12, color: "var(--danger)" }}>{saveError}</div>}
                <button onClick={handleSave} disabled={saving} style={{ background: saved ? "color-mix(in srgb, var(--success) 9%, transparent)" : "var(--primary)", border: saved ? "1px solid color-mix(in srgb, var(--success) 19%, transparent)" : "none", color: saved ? "var(--success)" : "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : saved ? "✓ Saved" : active === "experience" ? "Update Experience On-Chain" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
