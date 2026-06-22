"use client";

import { useState } from "react";
import Link from "next/link";
import { TIERS } from "@/lib/constants";

type Role = "creator" | "contributor" | "investor";
type Step = "role" | "details" | "confirm";

const ROLE_OPTIONS: { id: Role; icon: string; title: string; subtitle: string; desc: string; color: string; bg: string }[] = [
  { id: "creator",     icon: "🧩", title: "Creator",     subtitle: "Fund the work",       desc: "Post tasks, lock USDX in escrow, set experience requirements, and choose from matched applicants.",     color: "#F7931A", bg: "#F7931A18" },
  { id: "contributor", icon: "⚡", title: "Contributor", subtitle: "Get paid to build",   desc: "Browse experience-matched bounties, apply on-chain, complete work, and build your on-chain reputation.", color: "#8B80FF", bg: "#5546FF18" },
  { id: "investor",    icon: "🏛", title: "Patron",      subtitle: "Shape what gets built", desc: "Deposit USDX into the grant pool, stake STX for amplified governance weight, vote on grant applications.", color: "#00D395", bg: "#00D39518" },
];

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [experienceLevel, setExperienceLevel] = useState(0);
  const [githubVerify, setGithubVerify] = useState(false);

  const selectedRole = ROLE_OPTIONS.find((r) => r.id === role);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      {/* Back */}
      <Link href="/" style={{ position: "absolute", top: 24, left: 24, color: "#7070A0", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
        ← Back
      </Link>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #F7931A, #C4711A)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" /></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 22, color: "#F0F0F5" }}>Tasked</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#F0F0F5", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          {step === "role" ? "Choose your role" : step === "details" ? "Set up your profile" : "Confirm & register"}
        </h1>
        <p style={{ fontSize: 15, color: "#7070A0", margin: 0 }}>
          {step === "role" ? "Your role is stored on-chain and determines your experience on Tasked." : step === "details" ? "This information is stored on the Stacks blockchain." : "Review your details before calling register-user on-chain."}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
        {(["role", "details", "confirm"] as Step[]).map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === s ? "#F7931A" : (["role", "details", "confirm"].indexOf(step) > i ? "#00D395" : "#1E1E2A"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step === s || ["role", "details", "confirm"].indexOf(step) > i ? "#0A0A0F" : "#7070A0", transition: "all 0.2s" }}>
              {["role", "details", "confirm"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            {i < 2 && <div style={{ width: 32, height: 1, background: ["role", "details", "confirm"].indexOf(step) > i ? "#00D39540" : "#1E1E2A" }} />}
          </div>
        ))}
      </div>

      {/* Step: Role */}
      {step === "role" && (
        <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 16 }}>
          {ROLE_OPTIONS.map((r) => (
            <button key={r.id} onClick={() => setRole(r.id)}
              style={{ background: role === r.id ? r.bg : "#111116", border: `1px solid ${role === r.id ? r.color + "50" : "#1E1E2A"}`, borderRadius: 16, padding: "20px 24px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: r.bg, border: `1px solid ${r.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#F0F0F5" }}>{r.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.color, background: r.bg, padding: "2px 8px", borderRadius: 4, border: `1px solid ${r.color}30` }}>{r.subtitle}</span>
                </div>
                <p style={{ fontSize: 13, color: "#7070A0", margin: 0, lineHeight: 1.6 }}>{r.desc}</p>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${role === r.id ? r.color : "#2E2E3A"}`, background: role === r.id ? r.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {role === r.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0A0A0F" }} />}
              </div>
            </button>
          ))}

          <button disabled={!role} onClick={() => setStep("details")}
            style={{ marginTop: 8, background: role ? "#F7931A" : "#1E1E2A", color: role ? "#0A0A0F" : "#5050708", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: role ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
            Continue →
          </button>
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && selectedRole && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Username */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. satoshi.btc" maxLength={50}
              style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#F0F0F5", outline: "none", boxSizing: "border-box" }}
              onFocus={(e) => (e.target.style.borderColor = "#F7931A50")}
              onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
          </div>

          {/* Experience tier — contributor only */}
          {role === "contributor" && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>Experience Level</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TIERS.map((tier) => (
                  <button key={tier.id} onClick={() => setExperienceLevel(tier.id)}
                    style={{ background: experienceLevel === tier.id ? tier.bg : "#111116", border: `1px solid ${experienceLevel === tier.id ? tier.color + "50" : "#1E1E2A"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: tier.bg, border: `1px solid ${tier.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: tier.color }}>{tier.id}</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{tier.label}</div>
                        <div style={{ fontSize: 12, color: "#7070A0" }}>{tier.years}</div>
                      </div>
                    </div>
                    {experienceLevel === tier.id && <span style={{ color: tier.color, fontSize: 16 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GitHub */}
          {(role === "creator" || role === "contributor") && (
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#9090B0">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>GitHub Verification</div>
                    <div style={{ fontSize: 12, color: "#7070A0" }}>{role === "contributor" ? "Required for contributors" : "Recommended for creators"}</div>
                  </div>
                </div>
                <button onClick={() => setGithubVerify(!githubVerify)}
                  style={{ background: githubVerify ? "#00D39518" : "#111116", border: `1px solid ${githubVerify ? "#00D39540" : "#1E1E2A"}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: githubVerify ? "#00D395" : "#9090B0" }}>
                  {githubVerify ? "✓ Connected" : "Connect"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep("role")} style={{ flex: 1, background: "transparent", border: "1px solid #1E1E2A", color: "#9090B0", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
            <button disabled={!username.trim()} onClick={() => setStep("confirm")}
              style={{ flex: 2, background: username.trim() ? "#F7931A" : "#1E1E2A", color: username.trim() ? "#0A0A0F" : "#5050708", fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, border: "none", cursor: username.trim() ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
              Review →
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && selectedRole && (
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Registration Summary</div>
            {[
              { label: "Username", value: username },
              { label: "Role", value: selectedRole.title },
              ...(role === "contributor" ? [{ label: "Experience", value: `${TIERS[experienceLevel].label} (Tier ${experienceLevel})` }] : []),
              { label: "GitHub Verified", value: githubVerify ? "Yes" : "No" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1E1E2A" }}>
                <span style={{ fontSize: 14, color: "#7070A0" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#F7931A0A", border: "1px solid #F7931A20", borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: "#9090B0", lineHeight: 1.6 }}>
            Clicking <strong style={{ color: "#F0F0F5" }}>Register on Stacks</strong> will call <code style={{ color: "#F7931A", fontSize: 12 }}>register-user</code> on the Tasked contract. This is a one-time transaction. Your wallet will prompt for approval.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("details")} style={{ flex: 1, background: "transparent", border: "1px solid #1E1E2A", color: "#9090B0", fontWeight: 600, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>← Back</button>
            <button style={{ flex: 2, background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer" }}>
              Register on Stacks →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
