"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";
import type { UserRole } from "@/lib/mock";

type Step = "wallet" | "identity" | "role" | "confirm";

const ROLE_OPTIONS: { id: UserRole; icon: string; title: string; subtitle: string; desc: string; color: string; bg: string }[] = [
  { id: "creator",     icon: "🧩", title: "Owner",       subtitle: "Fund the work",        color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 9%, transparent)",
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

  const [step, setStep] = useState<Step>(connected ? "identity" : "wallet");
  const [role, setRole] = useState<UserRole | null>(null);
  const [experienceLevel, setExperienceLevel] = useState(-1); // -1 = not yet chosen; 0 ("Newcomer") is a valid, falsy tier so it can't double as "unset"
  const [googleVerified, setGoogleVerified] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleAvatar, setGoogleAvatar] = useState("");
  const [googleError, setGoogleError] = useState("");
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
      setStep("identity");
    }
    prevConnected.current = connected;
  }, [connected, step]);

  // Read Google profile back from OAuth callback redirect
  useEffect(() => {
    const googleEmailParam = searchParams.get("google_email");
    const name = searchParams.get("google_name");
    const avatar = searchParams.get("google_avatar");
    const error = searchParams.get("google_error");

    if (googleEmailParam) {
      setGoogleEmail(googleEmailParam);
      setGoogleName(name ?? googleEmailParam.split("@")[0]);
      setGoogleAvatar(avatar ?? "");
      setGoogleVerified(true);
      // Clean params from URL without triggering navigation
      window.history.replaceState({}, "", "/register");
    }
    if (error) {
      setGoogleError("Google connection failed. Please try again.");
      window.history.replaceState({}, "", "/register");
    }
  }, [searchParams]);

  const selectedRole = ROLE_OPTIONS.find(r => r.id === role);
  const hasIdentity = googleVerified;
  const STEPS: Step[] = ["wallet", "identity", "role", "confirm"];
  const stepIdx = STEPS.indexOf(step);

  function handleGoogleConnect() {
    setGoogleError("");
    window.location.href = "/api/auth/google?return_to=%2Fregister";
  }

  async function handleRegister() {
    const username = googleName || googleEmail.split("@")[0];
    if (!role || !username) return;
    setSubmitting(true);
    setRegisterError("");
    try {
      // Google's email doubles as the notification email automatically —
      // wallet-context's register() syncs it to profiles.email directly.
      await registerWallet({ username, role, experienceLevel: Math.max(0, experienceLevel), googleEmail, googleName, googleAvatar });
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
          {step === "wallet" ? "Connect your wallet" : step === "identity" ? "Set up your profile" : step === "role" ? "Choose your role" : "Confirm & register"}
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-dim)", margin: 0 }}>
          {step === "wallet" ? "Your wallet address is your on-chain identity." : step === "identity" ? "This information is stored on the Mezo blockchain." : step === "role" ? "Your role is stored on-chain and shapes your Taskify experience." : ""}
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

      {/* ── Step: Identity ── */}
      {step === "identity" && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 20 }}>
          {address && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "color-mix(in srgb, var(--success) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Connected</span>
              <code style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", letterSpacing: "0.01em" }}>{address}</code>
            </div>
          )}

          {/* Google — required Taskify identity; its email doubles as your notification email */}
          <div style={{ background: "var(--surface)", border: `1px solid ${googleVerified ? "color-mix(in srgb, var(--success) 25%, transparent)" : "var(--border)"}`, borderRadius: 16, padding: 24, transition: "border-color 0.2s" }}>
            {!googleVerified ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                    Connect Google <span style={{ color: "var(--danger)" }}>*</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
                    Required — your Google account becomes your Taskify identity. GitHub and X are optional and can be linked later from Settings.
                  </div>
                </div>
                {googleError && (
                  <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 8, padding: "8px 12px", width: "100%", textAlign: "center" }}>
                    {googleError}
                  </div>
                )}
                <button
                  onClick={handleGoogleConnect}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--text)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                  Continue with Google
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {googleAvatar ? (
                  <Image src={googleAvatar} alt={googleName} width={48} height={48} style={{ borderRadius: "50%", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, var(--success), var(--success-strong))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {googleName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{googleName}</div>
                  <div style={{ fontSize: 13, color: "var(--success)" }}>{googleEmail}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", padding: "4px 10px", borderRadius: 6 }}>✓ Verified</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              disabled={!hasIdentity}
              onClick={() => setStep("role")}
              style={{ width: "100%", background: hasIdentity ? "var(--primary)" : "var(--border)", color: hasIdentity ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: hasIdentity ? "pointer" : "not-allowed" }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Role ── */}
      {step === "role" && (
        <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 16 }}>
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
            <button onClick={() => setStep("identity")} style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
            <button
              disabled={!role || (role === "contributor" && experienceLevel < 0)}
              onClick={() => setStep("confirm")}
              style={{ flex: 2, background: (role && (role !== "contributor" || experienceLevel >= 0)) ? "var(--primary)" : "var(--border)", color: (role && (role !== "contributor" || experienceLevel >= 0)) ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, border: "none", cursor: (role && (role !== "contributor" || experienceLevel >= 0)) ? "pointer" : "not-allowed" }}>
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
              { label: "Google Account", value: googleEmail },
              { label: "Role", value: selectedRole.title },
              ...(role === "contributor" ? [{ label: "Experience", value: `${TIERS[experienceLevel].label} (Tier ${experienceLevel})` }] : []),
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
            <button onClick={() => setStep("role")} style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
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
