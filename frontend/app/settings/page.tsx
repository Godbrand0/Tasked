"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, TierBadge } from "@/components/ui/Badge";
import { MOCK_WALLET } from "@/lib/mock";
import { TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";

type Section = "profile" | "experience" | "notifications" | "wallet" | "danger";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",       icon: "👤" },
  { id: "experience",    label: "Experience",    icon: "🏅" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "wallet",        label: "Wallet",        icon: "🔐" },
  { id: "danger",        label: "Danger Zone",   icon: "⚠️" },
];

export default function SettingsPage() {
  const { xVerified, xHandle, linkX, unlinkX } = useWallet();
  const [active, setActive] = useState<Section>("profile");
  const [xHandleInput, setXHandleInput] = useState("");
  const [username, setUsername] = useState(MOCK_WALLET.username);
  const [bio, setBio] = useState("");
  const [expTier, setExpTier] = useState(MOCK_WALLET.experienceLevel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({ taskAssigned: true, workSubmitted: true, fundsReleased: true, grantVote: false, waveReward: true });

  function handleSave() {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 1000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 36px" }}>Manage your profile, experience tier, and notification preferences.</p>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "start" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "white" }}>
                    {MOCK_WALLET.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{MOCK_WALLET.username}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Badge color={MOCK_WALLET.role === "creator" ? "orange" : MOCK_WALLET.role === "contributor" ? "purple" : "green"}>
                        {MOCK_WALLET.role.charAt(0).toUpperCase() + MOCK_WALLET.role.slice(1)}
                      </Badge>
                      {MOCK_WALLET.githubVerified && <Badge color="green">GitHub Verified</Badge>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={50}
                      style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                      onFocus={(e) => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Stored on-chain. Changes cost a small MEZO gas fee.</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Bio <span style={{ fontWeight: 400 }}>(optional)</span></label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the community about yourself..." rows={3}
                      style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }}
                      onFocus={(e) => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>GitHub</div>
                        <div style={{ fontSize: 12, color: MOCK_WALLET.githubVerified ? "var(--success)" : "var(--text-dim)" }}>
                          {MOCK_WALLET.githubVerified ? `@${MOCK_WALLET.githubHandle ?? MOCK_WALLET.username}` : "Not connected"}
                        </div>
                      </div>
                    </div>
                    <button style={{ background: MOCK_WALLET.githubVerified ? "var(--border)" : "color-mix(in srgb, var(--success) 9%, transparent)", border: `1px solid ${MOCK_WALLET.githubVerified ? "var(--border)" : "color-mix(in srgb, var(--success) 19%, transparent)"}`, color: MOCK_WALLET.githubVerified ? "var(--text-dim)" : "var(--success)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                      {MOCK_WALLET.githubVerified ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>X <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(unlocks Community tasks)</span></div>
                        <div style={{ fontSize: 12, color: xVerified ? "var(--success)" : "var(--text-dim)" }}>
                          {xVerified ? `@${xHandle}` : "Not connected"}
                        </div>
                      </div>
                    </div>
                    {xVerified ? (
                      <button onClick={unlinkX} style={{ background: "var(--border)", border: "1px solid var(--border)", color: "var(--text-dim)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                        Disconnect
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={xHandleInput} onChange={(e) => setXHandleInput(e.target.value)} placeholder="@yourhandle"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", width: 140 }}
                          onFocus={(e) => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                          onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                        <button onClick={() => { if (xHandleInput.trim()) { linkX(xHandleInput.trim().replace(/^@/, "")); setXHandleInput(""); } }}
                          disabled={!xHandleInput.trim()}
                          style={{ background: xHandleInput.trim() ? "color-mix(in srgb, var(--success) 9%, transparent)" : "var(--border)", border: `1px solid ${xHandleInput.trim() ? "color-mix(in srgb, var(--success) 19%, transparent)" : "var(--border)"}`, color: xHandleInput.trim() ? "var(--success)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: xHandleInput.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                          Connect
                        </button>
                      </div>
                    )}
                  </div>
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
                {expTier !== MOCK_WALLET.experienceLevel && (
                  <div style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 13%, transparent)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Changing from <strong style={{ color: "var(--text)" }}>{TIERS[MOCK_WALLET.experienceLevel].label}</strong> to <strong style={{ color: TIERS[expTier].color }}>{TIERS[expTier].label}</strong>. This calls <code style={{ color: "var(--primary)", fontSize: 11 }}>updateExperience</code> on-chain.
                  </div>
                )}
              </div>
            )}

            {/* Notifications */}
            {active === "notifications" && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Notifications</h2>
                <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 24px" }}>Choose which on-chain events trigger notifications.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { key: "taskAssigned",  label: "Task Assigned",    desc: "When a creator assigns you to a task" },
                    { key: "workSubmitted", label: "Work Submitted",   desc: "When a contributor submits work on your task" },
                    { key: "fundsReleased", label: "Funds Released",   desc: "When MUSD is released to your wallet" },
                    { key: "grantVote",    label: "Grant Vote Opened", desc: "When a new grant application enters voting" },
                    { key: "waveReward",   label: "Wave Reward Ready", desc: "When a wave ends and your reward is claimable" },
                  ].map(({ key, label, desc }, i) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{label}</div>
                        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{desc}</div>
                      </div>
                      <button onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                        style={{ width: 44, height: 24, borderRadius: 12, background: notifs[key as keyof typeof notifs] ? "var(--primary)" : "var(--border)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: notifs[key as keyof typeof notifs] ? 23 : 3, transition: "left 0.2s" }} />
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
                    <div style={{ fontSize: 14, color: "var(--text)", fontFamily: "var(--font-geist-mono)", wordBreak: "break-all" }}>{MOCK_WALLET.address}</div>
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
                    <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)" }}>ST…TBD.taskify</div>
                  </div>
                  <button style={{ background: "color-mix(in srgb, var(--danger-strong) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-strong) 19%, transparent)", color: "var(--danger)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, cursor: "pointer", marginTop: 4 }}>
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
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>Refunds escrowed MUSD for all your open self-funded tasks. Cannot be undone.</div>
                    <button style={{ background: "color-mix(in srgb, var(--danger-strong) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-strong) 19%, transparent)", color: "var(--danger)", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
                      Cancel All Open Tasks
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            {(active === "profile" || active === "experience" || active === "notifications") && (
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSave} style={{ background: saved ? "color-mix(in srgb, var(--success) 9%, transparent)" : "var(--primary)", border: saved ? "1px solid color-mix(in srgb, var(--success) 19%, transparent)" : "none", color: saved ? "var(--success)" : "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", opacity: saving ? 0.7 : 1 }}>
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
