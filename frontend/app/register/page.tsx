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
  { id: "creator",     icon: "🧩", title: "Creator",     subtitle: "Fund the work",        color: "#F7931A", bg: "#F7931A18",
    desc: "Post tasks, lock USDX in escrow, set experience requirements, and choose from matched applicants." },
  { id: "contributor", icon: "⚡", title: "Contributor", subtitle: "Get paid to build",    color: "#8B80FF", bg: "#5546FF18",
    desc: "Browse experience-matched bounties, apply on-chain, complete work, and build your on-chain reputation." },
  { id: "investor",    icon: "🏛", title: "Patron",      subtitle: "Shape what gets built", color: "#00D395", bg: "#00D39518",
    desc: "Deposit USDX into the grant pool, stake STX for amplified governance weight, vote on grant applications." },
];

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? "#F7931A" : done ? "#00D395" : "#1E1E2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: (active || done) ? "#0A0A0F" : "#7070A0", transition: "all 0.2s", flexShrink: 0 }}>
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
  const [experienceLevel, setExperienceLevel] = useState(0);
  const [githubVerified, setGithubVerified] = useState(false);
  const [githubHandle, setGithubHandle] = useState("");
  const [githubName, setGithubName] = useState("");
  const [githubAvatar, setGithubAvatar] = useState("");
  const [githubError, setGithubError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const selectedRole = ROLE_OPTIONS.find(r => r.id === role);
  const STEPS: Step[] = ["wallet", "role", "details", "confirm"];
  const stepIdx = STEPS.indexOf(step);

  function handleGithubConnect() {
    setGithubError("");
    // Redirect to the Next.js API route which initiates GitHub OAuth
    window.location.href = "/api/auth/github";
  }

  function handleRegister() {
    if (!role || !githubHandle) return;
    setSubmitting(true);
    setTimeout(() => {
      registerWallet({ username: githubHandle, role, experienceLevel, githubVerified, githubHandle });
      setSubmitting(false);
      router.push("/dashboard");
    }, 1500);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <Link href="/" style={{ position: "absolute", top: 24, left: 24, color: "#7070A0", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
        ← Back
      </Link>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #F7931A, #C4711A)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" /></svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 22, color: "#F0F0F5" }}>Tasked</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#F0F0F5", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          {step === "wallet" ? "Connect your wallet" : step === "role" ? "Choose your role" : step === "details" ? "Set up your profile" : "Confirm & register"}
        </h1>
        <p style={{ fontSize: 15, color: "#7070A0", margin: 0 }}>
          {step === "wallet" ? "Your wallet address is your on-chain identity." : step === "role" ? "Your role is stored on-chain and shapes your Tasked experience." : step === "details" ? "This information is stored on the Stacks blockchain." : "Review your details before calling register-user on-chain."}
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StepDot label={String(i + 1)} active={step === s} done={stepIdx > i} />
            {i < STEPS.length - 1 && (
              <div style={{ width: 32, height: 1, background: stepIdx > i ? "#00D39540" : "#1E1E2A" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step: Wallet ── */}
      {step === "wallet" && (
        <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
          <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 20, padding: 32, marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#F0F0F5", margin: "0 0 12px" }}>No wallet connected</h2>
            <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.7, margin: "0 0 24px" }}>
              Connect your Stacks wallet to begin registration. Your wallet address becomes your permanent on-chain identity.
            </p>
            <button onClick={connect} style={{ width: "100%", background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer" }}>
              Connect Wallet →
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#50507080", lineHeight: 1.6 }}>
            Supports Leather, Xverse, Hiro, and other Stacks wallets. No email required.
          </div>
        </div>
      )}

      {/* ── Step: Role ── */}
      {step === "role" && (
        <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 16 }}>
          {address && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#00D39510", border: "1px solid #00D39530", borderRadius: 10, padding: "10px 16px", marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D395", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#7070A0" }}>Connected</span>
              <code style={{ fontSize: 13, fontWeight: 600, color: "#00D395", letterSpacing: "0.01em" }}>{address}</code>
            </div>
          )}
          {ROLE_OPTIONS.map(r => (
            <button key={r.id} onClick={() => setRole(r.id)}
              style={{ background: role === r.id ? r.bg : "#111116", border: `1px solid ${role === r.id ? r.color + "50" : "#1E1E2A"}`, borderRadius: 16, padding: "20px 24px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: r.bg, border: `1px solid ${r.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#F0F0F5" }}>{r.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: r.color, background: r.bg, padding: "2px 8px", borderRadius: 4, border: `1px solid ${r.color}30` }}>{r.subtitle}</span>
                </div>
                <p style={{ fontSize: 13, color: "#7070A0", margin: 0, lineHeight: 1.6 }}>{r.desc}</p>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${role === r.id ? r.color : "#2E2E3A"}`, background: role === r.id ? r.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {role === r.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0A0A0F" }} />}
              </div>
            </button>
          ))}
          <button disabled={!role} onClick={() => setStep("details")}
            style={{ marginTop: 8, background: role ? "#F7931A" : "#1E1E2A", color: role ? "#0A0A0F" : "#50507088", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: role ? "pointer" : "not-allowed" }}>
            Continue →
          </button>
        </div>
      )}

      {/* ── Step: Details ── */}
      {step === "details" && selectedRole && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* GitHub — required for all roles, provides username */}
          <div style={{ background: "#111116", border: `1px solid ${githubVerified ? "#00D39540" : "#1E1E2A"}`, borderRadius: 16, padding: 24, transition: "border-color 0.2s" }}>
            {!githubVerified ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1A1A22", border: "1px solid #2E2E3A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#9090B0">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", marginBottom: 6 }}>Connect GitHub</div>
                  <div style={{ fontSize: 13, color: "#7070A0", lineHeight: 1.6 }}>
                    Your GitHub username becomes your Tasked identity. No manual entry needed.
                  </div>
                </div>
                {githubError && (
                  <div style={{ fontSize: 13, color: "#F87171", background: "#F8717118", border: "1px solid #F8717130", borderRadius: 8, padding: "8px 12px", width: "100%", textAlign: "center" }}>
                    {githubError}
                  </div>
                )}
                <button
                  onClick={handleGithubConnect}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#F0F0F5", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer" }}>
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
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #00D395, #00A87A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {githubHandle.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#F0F0F5" }}>{githubName}</div>
                  <div style={{ fontSize: 13, color: "#00D395" }}>@{githubHandle}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#00D395", background: "#00D39518", border: "1px solid #00D39530", padding: "4px 10px", borderRadius: 6 }}>✓ Verified</div>
              </div>
            )}
          </div>

          {/* Experience tier — contributor only */}
          {role === "contributor" && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>
                Experience Level <span style={{ color: "#F87171" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TIERS.map(tier => (
                  <button key={tier.id} onClick={() => setExperienceLevel(tier.id)}
                    style={{ background: experienceLevel === tier.id ? tier.bg : "#111116", border: `1px solid ${experienceLevel === tier.id ? tier.color + "50" : "#1E1E2A"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: tier.bg, border: `1px solid ${tier.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: tier.color }}>{tier.id}</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{tier.label}</div>
                        <div style={{ fontSize: 12, color: "#7070A0" }}>{tier.years}</div>
                      </div>
                    </div>
                    {experienceLevel === tier.id && <span style={{ color: tier.color }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep("role")} style={{ flex: 1, background: "transparent", border: "1px solid #1E1E2A", color: "#9090B0", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
            <button
              disabled={!githubVerified || (role === "contributor" && !experienceLevel)}
              onClick={() => setStep("confirm")}
              style={{ flex: 2, background: (githubVerified && (role !== "contributor" || experienceLevel)) ? "#F7931A" : "#1E1E2A", color: (githubVerified && (role !== "contributor" || experienceLevel)) ? "#0A0A0F" : "#50507088", fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, border: "none", cursor: (githubVerified && (role !== "contributor" || experienceLevel)) ? "pointer" : "not-allowed" }}>
              Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Confirm ── */}
      {step === "confirm" && selectedRole && (
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Registration Summary</div>
            {[
              { label: "GitHub Username", value: `@${githubHandle}` },
              { label: "Role", value: selectedRole.title },
              ...(role === "contributor" ? [{ label: "Experience", value: `${TIERS[experienceLevel].label} (Tier ${experienceLevel})` }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1E1E2A" }}>
                <span style={{ fontSize: 14, color: "#7070A0" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#F7931A0A", border: "1px solid #F7931A20", borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: "#9090B0", lineHeight: 1.6 }}>
            Clicking <strong style={{ color: "#F0F0F5" }}>Register on Stacks</strong> will call <code style={{ color: "#F7931A", fontSize: 11 }}>register-user</code> on the Tasked contract. Your wallet will prompt for approval.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("details")} style={{ flex: 1, background: "transparent", border: "1px solid #1E1E2A", color: "#9090B0", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
            <button onClick={handleRegister} disabled={submitting}
              style={{ flex: 2, background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Registering on-chain…" : "Register on Stacks →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
