"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";
import type { UserRole } from "@/lib/mock";

type Step = "wallet" | "role" | "details" | "confirm";

const ROLE_OPTIONS: { id: UserRole; icon: string; title: string; subtitle: string; desc: string; color: string; bg: string }[] = [
  { id: "creator",     icon: "🧩", title: "Creator",     subtitle: "Fund the work",        color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 9%, transparent)",
    desc: "Post tasks, lock MUSD in escrow, set experience requirements, and choose from matched applicants." },
  { id: "contributor", icon: "⚡", title: "Contributor", subtitle: "Get paid to build",    color: "var(--secondary-light)", bg: "color-mix(in srgb, var(--secondary) 9%, transparent)",
    desc: "Browse experience-matched bounties, apply on-chain, complete work, and build your on-chain reputation." },
  { id: "investor",    icon: "🏛", title: "Patron",      subtitle: "Shape what gets built", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 9%, transparent)",
    desc: "Deposit MUSD into the grant pool, stake MEZO for amplified governance weight, vote on grant applications." },
];

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? "var(--primary)" : done ? "var(--success)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: (active || done) ? "var(--bg)" : "var(--text-dim)", transition: "all 0.2s", flexShrink: 0 }}>
        {done ? "✓" : label}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connected, isRegistered, address, connect, register: registerWallet } = useWallet();

  const [step, setStep] = useState<Step>(connected ? "role" : "wallet");
  const [role, setRole] = useState<UserRole | null>(null);
  const [experienceLevel, setExperienceLevel] = useState(-1); // -1 = not yet chosen; 0 ("Newcomer") is a valid, falsy tier so it can't double as "unset"
  const [githubVerified, setGithubVerified] = useState(false);
  const [githubHandle, setGithubHandle] = useState("");
  const [githubName, setGithubName] = useState("");
  const [githubAvatar, setGithubAvatar] = useState("");
  const [githubError, setGithubError] = useState("");
  const [xVerified, setXVerified] = useState(false);
  const [xHandle, setXHandle] = useState("");
  const [xName, setXName] = useState("");
  const [xAvatar, setXAvatar] = useState("");
  const [xError, setXError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // If already registered redirect to dashboard
  useEffect(() => {
    if (isRegistered) router.push("/dashboard");
  }, [isRegistered, router]);

  // Advance from wallet step when wallet connects
  const prevConnected = useRef(connected);
  useEffect(() => {
    if (!prevConnected.current && connected && step === "wallet") {
      setStep("role");
    }
    prevConnected.current = connected;
  }, [connected, step]);

  // Read GitHub profile back from OAuth callback redirect
  useEffect(() => {
    const handle = searchParams.get("github_handle");
    const name = searchParams.get("github_name");
    const avatar = searchParams.get("github_avatar");
    const error = searchParams.get("github_error");

    if (handle) {
      setGithubHandle(handle);
      setGithubName(name ?? handle);
      setGithubAvatar(avatar ?? "");
      setGithubVerified(true);
      // Clean params from URL without triggering navigation
      window.history.replaceState({}, "", "/register");
    }
    if (error) {
      setGithubError("GitHub connection failed. Please try again.");
      window.history.replaceState({}, "", "/register");
    }
  }, [searchParams]);

  // Read X (Twitter) profile back from OAuth callback redirect
  useEffect(() => {
    const handle = searchParams.get("x_handle");
    const name = searchParams.get("x_name");
    const avatar = searchParams.get("x_avatar");
    const error = searchParams.get("x_error");

    if (handle) {
      setXHandle(handle);
      setXName(name ?? handle);
      setXAvatar(avatar ?? "");
      setXVerified(true);
      window.history.replaceState({}, "", "/register");
    }
    if (error) {
      setXError("X connection failed. Please try again.");
      window.history.replaceState({}, "", "/register");
    }
  }, [searchParams]);

  const selectedRole = ROLE_OPTIONS.find(r => r.id === role);
  const hasIdentity = githubVerified || xVerified;
  const STEPS: Step[] = ["wallet", "role", "details", "confirm"];
  const stepIdx = STEPS.indexOf(step);

  function handleGithubConnect() {
    setGithubError("");
    // Redirect to the Next.js API route which initiates GitHub OAuth
    window.location.href = "/api/auth/github";
  }

  function handleXConnect() {
    setXError("");
    window.location.href = "/api/auth/x?return_to=%2Fregister";
  }

  async function handleRegister() {
    const username = githubHandle || xHandle;
    if (!role || !username) return;
    setSubmitting(true);
    setRegisterError("");
    try {
      await registerWallet({ username, role, experienceLevel: Math.max(0, experienceLevel), githubVerified, githubHandle, githubAvatar, xVerified, xHandle });
      router.push("/dashboard");
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <Link href="/" style={{ position: "absolute", top: 24, left: 24, color: "var(--text-dim)", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
        ← Back
      </Link>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", position: "relative", flexShrink: 0 }}>
          <Image src="/logo.jpg" alt="Taskify" fill sizes="36px" style={{ objectFit: "cover" }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 22, color: "var(--text)" }}>Taskify</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          {step === "wallet" ? "Connect your wallet" : step === "role" ? "Choose your role" : step === "details" ? "Set up your profile" : "Confirm & register"}
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-dim)", margin: 0 }}>
          {step === "wallet" ? "Your wallet address is your on-chain identity." : step === "role" ? "Your role is stored on-chain and shapes your Taskify experience." : step === "details" ? "This information is stored on the Mezo blockchain." : ""}
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StepDot label={String(i + 1)} active={step === s} done={stepIdx > i} />
            {i < STEPS.length - 1 && (
              <div style={{ width: 32, height: 1, background: stepIdx > i ? "color-mix(in srgb, var(--success) 25%, transparent)" : "var(--border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step: Wallet ── */}
      {step === "wallet" && (
        <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 12px" }}>No wallet connected</h2>
            <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.7, margin: "0 0 24px" }}>
              Connect your Ethereum wallet to begin registration. Your wallet address becomes your permanent on-chain identity.
            </p>
            <button onClick={connect} style={{ width: "100%", background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer" }}>
              Connect Wallet →
            </button>
          </div>
          <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--text-faint) 50%, transparent)", lineHeight: 1.6 }}>
            Supports MetaMask, Rabby, and other Ethereum wallets via RainbowKit. No email required.
          </div>
        </div>
      )}

      {/* ── Step: Role ── */}
      {step === "role" && (
        <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 16 }}>
          {address && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "color-mix(in srgb, var(--success) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: "10px 16px", marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Connected</span>
              <code style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", letterSpacing: "0.01em" }}>{address}</code>
            </div>
          )}
          {ROLE_OPTIONS.map(r => (
            <button key={r.id} onClick={() => setRole(r.id)}
              style={{ background: role === r.id ? r.bg : "var(--surface)", border: `1px solid ${role === r.id ? r.color + "50" : "var(--border)"}`, borderRadius: 16, padding: "20px 24px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: r.bg, border: `1px solid ${r.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{r.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: r.color, background: r.bg, padding: "2px 8px", borderRadius: 4, border: `1px solid ${r.color}30` }}>{r.subtitle}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>{r.desc}</p>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${role === r.id ? r.color : "var(--border-strong)"}`, background: role === r.id ? r.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {role === r.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--bg)" }} />}
              </div>
            </button>
          ))}
          <button disabled={!role} onClick={() => setStep("details")}
            style={{ marginTop: 8, background: role ? "var(--primary)" : "var(--border)", color: role ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: role ? "pointer" : "not-allowed" }}>
            Continue →
          </button>
        </div>
      )}

      {/* ── Step: Details ── */}
      {step === "details" && selectedRole && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* GitHub — connect this OR X below; at least one is required as your Taskify identity */}
          <div style={{ background: "var(--surface)", border: `1px solid ${githubVerified ? "color-mix(in srgb, var(--success) 25%, transparent)" : "var(--border)"}`, borderRadius: 16, padding: 24, transition: "border-color 0.2s" }}>
            {!githubVerified ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--text-muted)">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                    Connect GitHub {!xVerified && <span style={{ color: "var(--danger)" }}>*</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
                    {xVerified
                      ? "Optional — link GitHub too if you plan to apply for Development tasks."
                      : "Required unless you connect X below instead. Your GitHub username becomes your Taskify identity — recommended for Development tasks."}
                  </div>
                </div>
                {githubError && (
                  <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 8, padding: "8px 12px", width: "100%", textAlign: "center" }}>
                    {githubError}
                  </div>
                )}
                <button
                  onClick={handleGithubConnect}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--text)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Continue with GitHub
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {githubAvatar ? (
                  <Image src={githubAvatar} alt={githubHandle} width={48} height={48} style={{ borderRadius: "50%", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, var(--success), var(--success-strong))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {githubHandle.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{githubName}</div>
                  <div style={{ fontSize: 13, color: "var(--success)" }}>@{githubHandle}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", padding: "4px 10px", borderRadius: 6 }}>✓ Verified</div>
              </div>
            )}
          </div>

          {/* X (Twitter) — connect this OR GitHub above; at least one is required as your Taskify identity */}
          <div style={{ background: "var(--surface)", border: `1px solid ${xVerified ? "color-mix(in srgb, var(--success) 25%, transparent)" : "var(--border)"}`, borderRadius: 16, padding: 24, transition: "border-color 0.2s" }}>
            {!xVerified ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                    Connect X {!githubVerified && <span style={{ color: "var(--danger)" }}>*</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
                    {githubVerified
                      ? "Optional — link X too if you want to join Community tasks (memes, bug write-ups, social bounties)."
                      : "Required unless you connect GitHub above instead. Also unlocks Community tasks — no code required, great if you're not a developer."}
                  </div>
                </div>
                {xError && (
                  <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 8, padding: "8px 12px", width: "100%", textAlign: "center" }}>
                    {xError}
                  </div>
                )}
                <button
                  onClick={handleXConnect}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--text)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Continue with X
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {xAvatar ? (
                  <Image src={xAvatar} alt={xHandle} width={48} height={48} style={{ borderRadius: "50%", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, var(--success), var(--success-strong))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {xHandle.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{xName}</div>
                  <div style={{ fontSize: 13, color: "var(--success)" }}>@{xHandle}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", padding: "4px 10px", borderRadius: 6 }}>✓ Verified</div>
              </div>
            )}
          </div>

          {/* Experience tier — contributor only */}
          {role === "contributor" && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                Experience Level <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TIERS.map(tier => (
                  <button key={tier.id} onClick={() => setExperienceLevel(tier.id)}
                    style={{ background: experienceLevel === tier.id ? tier.bg : "var(--surface)", border: `1px solid ${experienceLevel === tier.id ? tier.color + "50" : "var(--border)"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: tier.bg, border: `1px solid ${tier.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: tier.color }}>{tier.id}</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{tier.label}</div>
                        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{tier.years}</div>
                      </div>
                    </div>
                    {experienceLevel === tier.id && <span style={{ color: tier.color }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep("role")} style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
            <button
              disabled={!hasIdentity || (role === "contributor" && experienceLevel < 0)}
              onClick={() => setStep("confirm")}
              style={{ flex: 2, background: (hasIdentity && (role !== "contributor" || experienceLevel >= 0)) ? "var(--primary)" : "var(--border)", color: (hasIdentity && (role !== "contributor" || experienceLevel >= 0)) ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, border: "none", cursor: (hasIdentity && (role !== "contributor" || experienceLevel >= 0)) ? "pointer" : "not-allowed" }}>
              Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Confirm ── */}
      {step === "confirm" && selectedRole && (
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Registration Summary</div>
            {[
              ...(githubVerified ? [{ label: "GitHub Username", value: `@${githubHandle}` }] : []),
              { label: "Role", value: selectedRole.title },
              ...(role === "contributor" ? [{ label: "Experience", value: `${TIERS[experienceLevel].label} (Tier ${experienceLevel})` }] : []),
              ...(xVerified ? [{ label: "X Account", value: `@${xHandle}` }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{value}</span>
              </div>
            ))}
          </div>

          {registerError && (
            <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
              {registerError}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("details")} style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
            <button onClick={handleRegister} disabled={submitting}
              style={{ flex: 2, background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Registering on-chain…" : "Register on Mezo →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
