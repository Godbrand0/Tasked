"use client";

import { useWallet, formatBalance, formatAddress } from "@/lib/wallet-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Landing page

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCoins() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconVote() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

function IconBitcoin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
    </svg>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Badge({ children, color = "orange" }: { children: React.ReactNode; color?: "orange" | "purple" | "green" | "blue" | "gray" }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: "#F7931A18", text: "#F7931A", border: "#F7931A30" },
    purple: { bg: "#5546FF18", text: "#8B80FF", border: "#5546FF30" },
    green:  { bg: "#00D39518", text: "#00D395", border: "#00D39530" },
    blue:   { bg: "#3B82F618", text: "#60A5FA", border: "#3B82F630" },
    gray:   { bg: "#FFFFFF0D", text: "#9090B0", border: "#FFFFFF18" },
  };
  const s = styles[color];
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.02em", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F7931A12", border: "1px solid #F7931A28", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "#F7931A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, padding: 28, ...style }}>
      {children}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const ROLE_DASHBOARD: Record<string, string> = {
  creator:     "/creator",
  contributor: "/contributor",
  investor:    "/investor",
};

function LandingNavbar() {
  const router = useRouter();
  const { connected, isRegistered, connect, role, address } = useWallet();

  const dashboardHref = role ? ROLE_DASHBOARD[role] : "/register";

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", background: "rgba(10,10,15,0.85)", borderBottom: "1px solid #1E1E2A" }}>
      <style>{`.taskify-nav-link:hover { color: #F0F0F5 !important; } .landing-btn-outline:hover { border-color: #F7931A80 !important; color: #F0F0F5 !important; } .landing-btn-primary:hover { background: #E8851A !important; }`}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #F7931A, #C4711A)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20, color: "#F0F0F5", letterSpacing: "-0.02em" }}>Taskify</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden sm:flex">
          {[["#how-it-works", "How it works"], ["#features", "Features"], ["/leaderboard", "Leaderboard"]].map(([href, label]) => (
            <a key={label} href={href} className="taskify-nav-link" style={{ color: "#9090B0", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.15s" }}>{label}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Connect Wallet — shows abbreviated address when connected */}
          <button
            onClick={() => { if (!connected) connect(); }}
            className="landing-btn-outline"
            style={{ display: "flex", alignItems: "center", gap: 8, color: connected ? "#F0F0F5" : "#9090B0", fontSize: 14, fontWeight: connected ? 600 : 500, padding: "8px 14px", background: connected ? "#111116" : "transparent", border: "1px solid #2E2E3A", borderRadius: 8, cursor: connected ? "default" : "pointer", transition: "all 0.15s" }}>
            {connected && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00D395", flexShrink: 0 }} />}
            <span style={{ fontFamily: connected ? "var(--font-geist-mono)" : "inherit", fontSize: connected ? 13 : 14 }}>
              {connected ? formatAddress(address) : "Connect Wallet"}
            </span>
          </button>

          {/* Launch App — routes based on role */}
          <button
            onClick={() => {
              if (!connected) { connect(); return; }
              router.push(isRegistered ? dashboardHref : "/register");
            }}
            className="landing-btn-primary"
            style={{ background: "#F7931A", color: "#0A0A0F", fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
            Launch App <IconArrow />
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function MockTaskCard() {
  return (
    <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px #1E1E2A" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <Badge color="green">● OPEN</Badge>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#00D395", fontSize: 13, fontWeight: 700 }}>
          <IconLock /> Escrowed
        </div>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: "0 0 6px", lineHeight: 1.4 }}>
        Build Mezo DeFi Analytics Dashboard
      </h3>
      <p style={{ fontSize: 13, color: "#7070A0", margin: "0 0 16px", lineHeight: 1.5 }}>
        React frontend connecting to the Mezo API to display protocol TVL, volume, and token stats.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge color="orange">500 MUSD</Badge>
        <Badge color="purple">Mid-level · Senior</Badge>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid #1E1E2A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>S</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#F0F0F5" }}>satoshi.btc</div>
            <div style={{ fontSize: 11, color: "#7070A0" }}>5 tasks posted</div>
          </div>
        </div>
        <div style={{ background: "#F7931A18", color: "#F7931A", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: "1px solid #F7931A30" }}>
          Apply →
        </div>
      </div>
    </div>
  );
}

function FloatingBadge({ style, children }: { style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 10, padding: "8px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...style }}>
      {children}
    </div>
  );
}

function Hero() {
  const { connect } = useWallet();
  return (
    <section style={{ padding: "96px 24px 80px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "radial-gradient(ellipse, rgba(247,147,26,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 100, right: 100, width: 400, height: 400, background: "radial-gradient(ellipse, rgba(85,70,255,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="block sm:grid">
        <div>
          <div style={{ marginBottom: 24 }}>
            <Badge color="orange">
              <span style={{ fontSize: 10 }}>⛓</span> Built on Mezo · Bitcoin-secured
            </Badge>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 24px", color: "#F0F0F5" }}>
            The On-Chain{" "}
            <span style={{ background: "linear-gradient(90deg, #F7931A, #FFB347)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Bounty Board
            </span>{" "}
            for the Mezo Community
          </h1>
          <p style={{ fontSize: 18, color: "#9090B0", lineHeight: 1.7, margin: "0 0 36px", maxWidth: 480 }}>
            Post Development tasks matched by experience tier, or Community tasks anyone can join — MUSD locks in escrow either way, all enforced by Solidity contracts. No trust required.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={connect} style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Post a Task <IconArrow />
            </button>
            <a href="/tasks" style={{ background: "transparent", color: "#F0F0F5", fontWeight: 600, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", border: "1px solid #1E1E2A", display: "flex", alignItems: "center", gap: 8 }}>
              Find Work
            </a>
          </div>
          <div style={{ marginTop: 36, display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { val: "3–5%", label: "Protocol fee" },
              { val: "30-day", label: "Wave rewards" },
              { val: "2 task kinds", label: "Development · Community" },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#F7931A" }}>{val}</div>
                <div style={{ fontSize: 12, color: "#7070A0", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — task card mockup */}
        <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
          <FloatingBadge style={{ top: -12, left: 20, color: "#00D395" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D395", display: "inline-block" }} />
            MUSD locked in escrow
          </FloatingBadge>
          <MockTaskCard />
          <FloatingBadge style={{ bottom: 16, right: 8, color: "#8B80FF" }}>
            <span>🎓</span> Experience-gated on-chain
          </FloatingBadge>
        </div>
      </div>
    </section>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────

function TrustBar() {
  const items = [
    { icon: <IconBitcoin />, label: "Bitcoin-secured" },
    { icon: <IconShield />, label: "Solidity contracts" },
    { icon: <IconGithub />, label: "GitHub or X verified" },
    { icon: <IconLock />, label: "Trustless escrow" },
    { icon: <IconCoins />, label: "MUSD + MEZO native" },
  ];
  return (
    <div style={{ borderTop: "1px solid #1E1E2A", borderBottom: "1px solid #1E1E2A", padding: "20px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
        {items.map(({ icon, label }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "#7070A0", fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: "#F7931A" }}>{icon}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Create & Lock Escrow",
      desc: "Post a Development task with an experience range, or a Community task anyone can join — choose MUSD or MEZO. The token locks in the smart contract the moment the task goes live. No trust required from either side.",
      color: "#F7931A",
      icon: "🔒",
    },
    {
      num: "02",
      title: "Apply, or Just Join In",
      desc: "Development tasks match one contributor by declared experience tier, verified on-chain at applyForTask. Community tasks skip that gate entirely — anyone joins with a proof-of-participation link, no code required.",
      color: "#5546FF",
      icon: "🎯",
    },
    {
      num: "03",
      title: "Work & Get Paid On-Chain",
      desc: "Approve a Development task's submission to release MUSD to one contributor, or pick up to N winners on a Community task and split the escrow between them — one transaction, no intermediary, no counterparty risk.",
      color: "#00D395",
      icon: "⚡",
    },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>How it works</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#F0F0F5" }}>
            Three steps. Zero trust.
          </h2>
          <p style={{ fontSize: 16, color: "#7070A0", marginTop: 12, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Every action — escrow, matching, payment — is enforced by the Solidity contract, not by Taskify.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {steps.map(({ num, title, desc, color, icon }) => (
            <Card key={num} style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -10, fontSize: 80, opacity: 0.04, fontWeight: 900 }}>{num}</div>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.06em", marginBottom: 8 }}>{num}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#F0F0F5", margin: "0 0 12px" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.7, margin: 0 }}>{desc}</p>
              <div style={{ marginTop: 20, height: 2, borderRadius: 4, background: `linear-gradient(90deg, ${color}40, transparent)` }} />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Experience Matching ──────────────────────────────────────────────────────

function ExperienceSection() {
  const tiers = [
    { id: 0, label: "Newcomer", years: "0 – 1 year",  color: "#7070A0", bg: "#FFFFFF0D" },
    { id: 1, label: "Junior",   years: "1 – 2 years", color: "#60A5FA", bg: "#3B82F618" },
    { id: 2, label: "Mid-level",years: "2 – 3 years", color: "#A78BFA", bg: "#7C3AED18" },
    { id: 3, label: "Senior",   years: "3 – 5 years", color: "#F7931A", bg: "#F7931A18" },
    { id: 4, label: "Expert",   years: "5+ years",    color: "#FFD700", bg: "#FFD70018" },
  ];

  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        {/* Left */}
        <div>
          <SectionLabel>Experience matching</SectionLabel>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 20px", color: "#F0F0F5" }}>
            From{" "}
            <span style={{ background: "linear-gradient(90deg, #F7931A, #FFB347)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              "first to apply"
            </span>{" "}
            to "best fit applies"
          </h2>
          <p style={{ fontSize: 15, color: "#7070A0", lineHeight: 1.8, margin: "0 0 28px" }}>
            Creators select a minimum and maximum experience tier when posting. Contributors declare their level at registration. The Solidity contract verifies the match when a contributor applies — not just the UI.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Creators", text: "Get applicants who genuinely fit the task scope." },
              { label: "Contributors", text: "See a curated feed of relevant work, not noise." },
              { label: "On-chain", text: "Experience gate is enforced at applyForTask, not filtered away client-side." },
            ].map(({ label, text }) => (
              <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#F7931A18", border: "1px solid #F7931A30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, color: "#F7931A" }}>
                  <IconCheck />
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{label}: </span>
                  <span style={{ fontSize: 14, color: "#7070A0" }}>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — tier ladder */}
        <div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E1E2A" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Experience Tiers</div>
            </div>
            {tiers.map((tier, i) => (
              <div key={tier.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: i < tiers.length - 1 ? "1px solid #1E1E2A" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: tier.bg, border: `1px solid ${tier.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: tier.color }}>
                    {tier.id}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{tier.label}</div>
                    <div style={{ fontSize: 12, color: "#7070A0" }}>{tier.years}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: tier.color, background: tier.bg, padding: "4px 10px", borderRadius: 6, border: `1px solid ${tier.color}30` }}>
                  Tier {tier.id}
                </div>
              </div>
            ))}
            <div style={{ padding: "14px 24px", background: "#F7931A0A", borderTop: "1px solid #F7931A18", display: "flex", alignItems: "center", gap: 8 }}>
              <IconShield />
              <span style={{ fontSize: 12, color: "#F7931A", fontWeight: 600 }}>Gate enforced on-chain by Solidity — not a UI filter</span>
            </div>
          </Card>
          <p style={{ fontSize: 12, color: "#7070A0", marginTop: 12, lineHeight: 1.6 }}>
            This gate applies to <strong style={{ color: "#9090B0" }}>Development tasks</strong> only — Community tasks (memes, bug write-ups, social bounties) are open to anyone, no tier required.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── User Roles ───────────────────────────────────────────────────────────────

function RolesSection() {
  const { connect } = useWallet();
  const roles = [
    {
      icon: <IconCode />,
      color: "#F7931A",
      bg: "#F7931A18",
      title: "Creator",
      subtitle: "Fund the work",
      desc: "Post a Development task matched by experience tier, or a Community task anyone can join — lock MUSD in escrow either way.",
      features: [
        "Self-funded, community-grant, or Community (multi-winner) tasks",
        "Experience range picker for Development tasks",
        "Pick up to N winners on Community tasks — payout splits evenly, one transaction",
        "Approve work (or select winners) to release payment",
        "Wave pool rewards for active self-funded creators",
      ],
      cta: "Post a Task",
    },
    {
      icon: <IconUsers />,
      color: "#5546FF",
      bg: "#5546FF18",
      title: "Contributor",
      subtitle: "Get paid to build — or just to show up",
      desc: "GitHub-verified? Apply to experience-matched Development bounties. Just X-linked? Join Community tasks — memes, bug write-ups, social bounties — no code required.",
      features: [
        "Development: experience-matched task feed, GitHub-verified identity",
        "Community: join with a proof link, no experience tier or code needed",
        "Permanent on-chain task history either way",
        "Portable reputation (MUSD earned + tasks done)",
        "Public profile at /profile/[address]",
      ],
      cta: "Find Work",
    },
    {
      icon: <IconVote />,
      color: "#00D395",
      bg: "#00D39518",
      title: "Investor",
      subtitle: "Shape what gets built",
      desc: "Deposit MUSD into the patron pool, stake MEZO for amplified governance weight, and vote on grant applications.",
      features: [
        "Permanent MUSD deposits → patron tiers",
        "MEZO staking boosts voting weight 10×",
        "Vote For / Against grant applications",
        "Bronze → Silver → Gold → Diamond tiers",
        "No lockup for MEZO stake — always withdrawable",
      ],
      cta: "Become a Patron",
    },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>Who is Taskify for?</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#F0F0F5" }}>
            Three roles. One closed-loop economy.
          </h2>
          <p style={{ fontSize: 16, color: "#7070A0", marginTop: 12 }}>
            Every participant strengthens the protocol for everyone else.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {roles.map(({ icon, color, bg, title, subtitle, desc, features, cta }) => (
            <div key={title} style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 20 }}>
                {icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{subtitle}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5", margin: "0 0 10px" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.7, margin: "0 0 24px" }}>{desc}</p>
              <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 10, flexGrow: 1 }}>
                {features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#9090B0" }}>
                    <span style={{ color, flexShrink: 0, marginTop: 1 }}><IconCheck /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={connect} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, background: bg, border: `1px solid ${color}30`, color, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                {cta} <IconArrow />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Protocol Mechanics ───────────────────────────────────────────────────────

function ProtocolSection() {
  const states = ["GRANT_PENDING", "OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "FUNDS_RELEASED"];
  const activeIdx = 3;

  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>Protocol mechanics</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#F0F0F5" }}>
            Every state enforced on-chain
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* Task lifecycle */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Task Lifecycle (Development)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {states.map((state, i) => (
                <div key={state} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < states.length - 1 ? "1px solid #1E1E2A" : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 20 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === activeIdx ? "#F7931A" : i < activeIdx ? "#00D395" : "#1E1E2A", border: `2px solid ${i === activeIdx ? "#F7931A" : i < activeIdx ? "#00D395" : "#2E2E3A"}`, flexShrink: 0 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: i === activeIdx ? 700 : 500, color: i === activeIdx ? "#F7931A" : i < activeIdx ? "#00D395" : "#5050708" }}>
                    {state}
                  </span>
                  {i === activeIdx && <Badge color="orange">current</Badge>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "#7070A0", lineHeight: 1.6 }}>
              Community tasks skip ASSIGNED / IN_PROGRESS / SUBMITTED entirely — they go straight from OPEN to FUNDS_RELEASED once the creator selects winners.
            </div>
          </Card>

          {/* Fee breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Fee Collection</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Self-funded task fee", rate: "3%", example: "300 MUSD on a 10k task" },
                  { label: "Grant-funded task fee", rate: "5%", example: "500 MUSD on a 10k task" },
                ].map(({ label, rate, example }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>{label}</div>
                      <div style={{ fontSize: 12, color: "#7070A0" }}>{example}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#F7931A" }}>{rate}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Fee Distribution</div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 6, background: "#F7931A18", border: "1px solid #F7931A30", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#F7931A" }}>60%</div>
                  <div style={{ fontSize: 13, color: "#9090B0", marginTop: 4 }}>Platform treasury</div>
                </div>
                <div style={{ flex: 4, background: "#5546FF18", border: "1px solid #5546FF30", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#8B80FF" }}>40%</div>
                  <div style={{ fontSize: 13, color: "#9090B0", marginTop: 4 }}>Creator wave pool</div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "#7070A0", lineHeight: 1.6 }}>
                Wave pool distributes to active self-funded creators every ~30 days, proportional to tasks posted that epoch.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Token Section ────────────────────────────────────────────────────────────

function TokensSection() {
  return (
    <section id="tokens" style={{ padding: "96px 24px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>Native tokens</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#F0F0F5" }}>
            MUSD pays. MEZO governs.
          </h2>
          <p style={{ fontSize: 16, color: "#7070A0", marginTop: 12 }}>
            Both tokens are native to the Mezo ecosystem. Neither is speculative filler.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* MUSD */}
          <Card style={{ borderColor: "#00D39530" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#00D39518", border: "1px solid #00D39530", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconCoins />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#00D395", letterSpacing: "0.06em", textTransform: "uppercase" }}>Payment token</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5" }}>MUSD</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.7, margin: "0 0 20px" }}>
              Bitcoin-backed stablecoin native to Mezo. The primary escrow currency — contributors know exactly what they earn with zero price exposure.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Locks in escrow at task creation",
                "Releases directly to contributor on approval",
                "Patron pool deposits denominated in MUSD",
                "Wave rewards paid in MUSD",
                "Multi-token tasks supported via ERC-20",
              ].map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#9090B0" }}>
                  <span style={{ color: "#00D395", flexShrink: 0, marginTop: 1 }}><IconCheck /></span>
                  {f}
                </div>
              ))}
            </div>
          </Card>

          {/* MEZO */}
          <Card style={{ borderColor: "#5546FF30" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#5546FF18", border: "1px solid #5546FF30", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B80FF" }}>
                <IconVote />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8B80FF", letterSpacing: "0.06em", textTransform: "uppercase" }}>Governance token</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5" }}>MEZO</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.7, margin: "0 0 20px" }}>
              Native Mezo token. Stake MEZO to amplify voting weight on grant applications — turning passive holders into active ecosystem governors.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "1 MEZO staked = 10 MUSD governance weight",
                "Always withdrawable — no lockup or slashing",
                "Multiplier adjustable by contract owner",
                "Unstaking does not alter past votes",
                "Growing grant pool increases governance value",
              ].map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#9090B0" }}>
                  <span style={{ color: "#8B80FF", flexShrink: 0, marginTop: 1 }}><IconCheck /></span>
                  {f}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Voting weight formula */}
        <div style={{ marginTop: 24, background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Voting weight formula</div>
            <code style={{ fontSize: 15, color: "#F0F0F5", fontFamily: "var(--font-geist-mono), monospace" }}>
              <span style={{ color: "#00D395" }}>total-musd-deposited</span>
              {" + ("}
              <span style={{ color: "#8B80FF" }}>mezo-staked</span>
              {" × "}
              <span style={{ color: "#F7931A" }}>10</span>
              {" / 1e6)"}
            </code>
          </div>
          <div style={{ fontSize: 13, color: "#7070A0", maxWidth: 320 }}>
            Staking 1,000 MEZO adds 10,000 MUSD-equivalent voting units. Capital commitment and ecosystem conviction both shape governance.
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const FAQ_ITEMS = [
  {
    q: "What is Taskify?",
    a: "Taskify is an on-chain bounty board on Mezo. Creators post tasks and lock MUSD in escrow, contributors apply and get paid on approval, and Patrons fund a community grant pool and vote on which grant-funded tasks get built. Every step — escrow, experience gating, payment — is enforced by the Taskify smart contract, not by a central party.",
  },
  {
    q: "What is MUSD and why does Taskify use it?",
    a: "MUSD is Mezo's native Bitcoin-backed stablecoin. It's the default escrow and payout currency, so contributors know exactly what a bounty is worth with no price exposure between the day a task is posted and the day it's paid out.",
  },
  {
    q: "What is MEZO and what does staking it do?",
    a: "MEZO is Mezo's governance token. Patrons can stake it to amplify their voting weight on grant applications — 1,000 MEZO staked adds meaningful voting power on top of any MUSD deposited. Staked MEZO is always withdrawable; there's no lockup or slashing.",
  },
  {
    q: "How does experience matching work?",
    a: "Creators set a minimum and maximum experience tier when posting a task. Contributors declare their own tier at registration. The contract itself checks the match when a contributor calls applyForTask — it's enforced on-chain, not just filtered in the UI.",
  },
  {
    q: "What kind of tasks should I post as a creator?",
    a: "Keep self-funded tasks small and tightly scoped — the bounty amounts on Taskify are modest, so the work should match. Think \"fix a broken footer layout,\" \"make the dashboard page responsive on mobile,\" \"add a loading skeleton to the tasks list,\" or \"write unit tests for one contract function.\" A task a contributor can realistically finish in a few hours to a couple of days gets applicants faster and gets reviewed and paid faster than an open-ended multi-week feature.",
  },
  {
    q: "Can I post a large, multi-week feature as one task?",
    a: "You can, but it's not what the protocol is optimized for. Large scope is better split into several small self-funded tasks — each with its own escrow, its own applicant, and its own payout — or posted as a grant-funded task so the community can weigh in on whether the scope and requested amount make sense before any MUSD moves.",
  },
  {
    q: "Is my money safe in escrow?",
    a: "Funds move only through the Taskify contract: MUSD locks in at task creation and only leaves escrow when the creator approves submitted work, when a task is cancelled before assignment, or when a task expires past its deadline. There's no custodial intermediary holding funds at any point.",
  },
  {
    q: "What fees does Taskify take?",
    a: "3% on self-funded tasks, 5% on grant-funded tasks. 60% of every fee goes to the protocol treasury and 40% goes into the wave pool, which is redistributed to active self-funded creators roughly every 30 days.",
  },
  {
    q: "What wallets are supported?",
    a: "Any standard Ethereum wallet via RainbowKit — MetaMask, Rabby, Rainbow, WalletConnect-compatible mobile wallets, or any browser-injected wallet.",
  },
  {
    q: "Has the Taskify contract been audited?",
    a: "The protocol is under active review. Check the repository for the latest audit status before depositing meaningful funds, and always start with amounts you're comfortable testing with.",
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" style={{ padding: "96px 24px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>FAQ</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#F0F0F5" }}>
            Frequently asked questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_ITEMS.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} style={{ background: "#111116", border: `1px solid ${open ? "#F7931A30" : "#1E1E2A"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.15s" }}>
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: open ? "#F7931A" : "#F0F0F5" }}>{item.q}</span>
                  <span style={{ color: open ? "#F7931A" : "#7070A0" }}><IconChevron open={open} /></span>
                </button>
                {open && (
                  <div style={{ padding: "0 22px 20px", fontSize: 14, color: "#9090B0", lineHeight: 1.75 }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  const { connect } = useWallet();
  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", background: "linear-gradient(135deg, #111116 0%, #16121A 100%)", border: "1px solid #F7931A28", borderRadius: 24, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(247,147,26,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <SectionLabel>Get started</SectionLabel>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 20px", color: "#F0F0F5" }}>
            Start building on Mezo
          </h2>
          <p style={{ fontSize: 17, color: "#7070A0", margin: "0 auto 40px", maxWidth: 480, lineHeight: 1.7 }}>
            Post a task, find work, or invest in the builders shaping the Bitcoin-secured ecosystem.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={connect} style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Post a Task <IconArrow />
            </button>
            <a href="/tasks" style={{ background: "#5546FF18", color: "#8B80FF", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", border: "1px solid #5546FF30", display: "flex", alignItems: "center", gap: 8 }}>
              Find Work
            </a>
            <button onClick={connect} style={{ background: "#00D39518", color: "#00D395", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, border: "1px solid #00D39530", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Become a Patron
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const links: Record<string, { label: string; href: string }[]> = {
    Protocol: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Task escrow", href: "#how-it-works" },
      { label: "Grant pool", href: "#features" },
      { label: "Wave rewards", href: "#features" },
    ],
    Builders: [
      { label: "Browse tasks", href: "/tasks" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Docs", href: "#" },
      { label: "GitHub", href: "#" },
    ],
    Tokens: [
      { label: "MUSD", href: "#tokens" },
      { label: "MEZO staking", href: "#tokens" },
      { label: "Patron tiers", href: "#tokens" },
      { label: "Governance", href: "#tokens" },
    ],
    Legal: [
      { label: "FAQ", href: "#faq" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  };

  return (
    <footer style={{ borderTop: "1px solid #1E1E2A", padding: "60px 24px 40px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }} className="block sm:grid">
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #F7931A, #C4711A)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, color: "#F0F0F5" }}>Taskify</span>
            </div>
            <p style={{ fontSize: 13, color: "#7070A0", lineHeight: 1.7, maxWidth: 280, margin: "0 0 16px" }}>
              The on-chain bounty board for the Mezo community. Trustless escrow, community grants, Development and Community tasks alike.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D395" }} />
              <span style={{ fontSize: 12, color: "#00D395", fontWeight: 600 }}>Mezo Testnet</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F0F0F5", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>{group}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((item) => (
                  <a key={item.label} href={item.href} style={{ fontSize: 13, color: "#7070A0", textDecoration: "none" }}>{item.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #1E1E2A", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#505070" }}>
            © 2025 Taskify. Built on <span style={{ color: "#F7931A" }}>Mezo</span>, secured by Bitcoin.
          </div>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#505070", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Contract:</span>
            <span style={{ color: "#7070A0" }}>0x…TBD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="font-(family-name:--font-geist-sans)">
      <LandingNavbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <ExperienceSection />
      <RolesSection />
      <ProtocolSection />
      <TokensSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
