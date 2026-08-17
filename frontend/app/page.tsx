"use client";

import { useWallet, formatBalance, formatAddress } from "@/lib/wallet-context";
import { TASKIFY_ADDRESS } from "@/lib/taskify";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ThemeToggle from "@/components/ui/ThemeToggle";

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
    orange: { bg: "color-mix(in srgb, var(--primary) 9%, transparent)", text: "var(--primary)", border: "color-mix(in srgb, var(--primary) 19%, transparent)" },
    purple: { bg: "color-mix(in srgb, var(--secondary) 9%, transparent)", text: "var(--secondary-light)", border: "color-mix(in srgb, var(--secondary) 19%, transparent)" },
    green:  { bg: "color-mix(in srgb, var(--success) 9%, transparent)", text: "var(--success)", border: "color-mix(in srgb, var(--success) 19%, transparent)" },
    blue:   { bg: "color-mix(in srgb, var(--blue-strong) 9%, transparent)", text: "var(--blue)", border: "color-mix(in srgb, var(--blue-strong) 19%, transparent)" },
    gray:   { bg: "var(--neutral-tint)", text: "var(--text-muted)", border: "color-mix(in srgb, var(--text) 9%, transparent)" },
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, ...style }}>
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

const LANDING_NAV_LINKS: [string, string][] = [["#how-it-works", "How it works"], ["#features", "Features"], ["/leaderboard", "Leaderboard"]];

function LandingNavbar() {
  const router = useRouter();
  const { connected, isRegistered, connect, disconnect, role, address } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(e.target as Node)) {
        setAddressDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dashboardHref = role ? ROLE_DASHBOARD[role] : "/register";

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", background: "color-mix(in srgb, var(--bg) 85%, transparent)", borderBottom: "1px solid var(--border)" }}>
      <style>{`.taskify-nav-link:hover { color: var(--text) !important; } .landing-btn-outline:hover { border-color: color-mix(in srgb, var(--primary) 50%, transparent) !important; color: var(--text) !important; } .landing-btn-primary:hover { background: var(--primary-strong) !important; }`}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", position: "relative", flexShrink: 0 }}>
            <Image src="/logo.jpg" alt="Taskify" fill sizes="32px" style={{ objectFit: "cover" }} />
          </div>
          <span className="hidden sm:inline" style={{ fontWeight: 700, fontSize: 20, color: "var(--text)", letterSpacing: "-0.02em" }}>Taskify</span>
        </div>

        <div style={{ alignItems: "center", gap: 32 }} className="hidden sm:flex">
          {LANDING_NAV_LINKS.map(([href, label]) => (
            <a key={label} href={href} className="taskify-nav-link" style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.15s" }}>{label}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          {/* Connect Wallet: shows abbreviated address when connected (with a disconnect dropdown) — hidden on mobile, Launch App covers the same action */}
          {connected ? (
            <div ref={addressDropdownRef} style={{ position: "relative" }} className="hidden sm:block">
              <button
                onClick={() => setAddressDropdownOpen(o => !o)}
                className="landing-btn-outline"
                style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)", fontSize: 14, fontWeight: 600, padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13 }}>{formatAddress(address)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: addressDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>

              {addressDropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 8, minWidth: 220, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", zIndex: 100 }}>
                  <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid var(--border)", marginBottom: 6, fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "color-mix(in srgb, var(--text-faint) 50%, transparent)", wordBreak: "break-all" }}>
                    {address}
                  </div>
                  <button
                    onClick={() => { disconnect(); setAddressDropdownOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "var(--danger)", background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={connect}
              className="landing-btn-outline hidden sm:flex"
              style={{ alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, fontWeight: 500, padding: "8px 14px", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
              Connect Wallet
            </button>
          )}

          {/* Launch App: routes based on role */}
          <button
            onClick={() => {
              if (!connected) { connect(); return; }
              router.push(isRegistered ? dashboardHref : "/register");
            }}
            className="landing-btn-primary"
            style={{ background: "var(--primary)", color: "var(--bg)", fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
            Launch App <IconArrow />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="flex sm:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            {mobileMenuOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="flex sm:hidden" style={{ borderTop: "1px solid var(--border)", padding: "12px 24px 20px", flexDirection: "column", gap: 4, background: "var(--bg)" }}>
          {LANDING_NAV_LINKS.map(([href, label]) => (
            <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
              style={{ padding: "10px 12px", borderRadius: 8, color: "var(--text-muted)", fontSize: 15, fontWeight: 500, textDecoration: "none" }}>
              {label}
            </a>
          ))}
          {connected && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-geist-mono)", color: "var(--text-dim)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
                {formatAddress(address)}
              </div>
              <button onClick={disconnect} style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function MockTaskCard() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <Badge color="green">● OPEN</Badge>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--success)", fontSize: 13, fontWeight: 700 }}>
          <IconLock /> Escrowed
        </div>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 6px", lineHeight: 1.4 }}>
        Build Mezo DeFi Analytics Dashboard
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.5 }}>
        React frontend connecting to the Mezo API to display protocol TVL, volume, and token stats.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge color="orange">500 MUSD</Badge>
        <Badge color="purple">Mid-level · Senior</Badge>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>S</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>satoshi.btc</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>5 tasks posted</div>
          </div>
        </div>
        <div style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: "var(--primary)", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>
          Apply →
        </div>
      </div>
    </div>
  );
}

function FloatingBadge({ style, children }: { style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...style }}>
      {children}
    </div>
  );
}

function Hero() {
  const { connect } = useWallet();
  return (
    <section style={{ padding: "96px 24px 80px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "radial-gradient(ellipse, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 100, right: 100, width: 400, height: 400, background: "radial-gradient(ellipse, color-mix(in srgb, var(--secondary) 6%, transparent) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="block sm:grid">
        <div>
          <div style={{ marginBottom: 24 }}>
            <Badge color="orange">
              <span style={{ fontSize: 10 }}>⛓</span> Built on Mezo · Bitcoin-secured
            </Badge>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 24px", color: "var(--text)" }}>
            The On-Chain{" "}
            <span style={{ background: "linear-gradient(90deg, var(--primary), var(--primary-strong))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Bounty Board
            </span>{" "}
            for the Mezo Community
          </h1>
          <p style={{ fontSize: 18, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 36px", maxWidth: 480 }}>
            Post Development tasks matched by experience tier, or Community tasks anyone can join. MUSD locks in escrow either way, all enforced on-chain. No trust required.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={connect} style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Post a Task <IconArrow />
            </button>
            <a href="/tasks" style={{ background: "transparent", color: "var(--text)", fontWeight: 600, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
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
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>{val}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: task card mockup */}
        <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
          <FloatingBadge style={{ top: -12, left: 20, color: "var(--success)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
            MUSD locked in escrow
          </FloatingBadge>
          <MockTaskCard />
          <FloatingBadge style={{ bottom: 16, right: 8, color: "var(--secondary-light)" }}>
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
    { icon: <IconGithub />, label: "GitHub or X verified" },
    { icon: <IconLock />, label: "Trustless escrow" },
    { icon: <IconCoins />, label: "MUSD + MEZO native" },
  ];
  return (
    <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "20px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
        {items.map(({ icon, label }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-dim)", fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: "var(--primary)" }}>{icon}</span>
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
      desc: "Post a Development task with an experience range, or a Community task anyone can join, choosing MUSD or MEZO. The token locks in the smart contract the moment the task goes live. No trust required from either side.",
      color: "var(--primary)",
      icon: "🔒",
    },
    {
      num: "02",
      title: "Apply, or Just Join In",
      desc: "Development tasks match one contributor by declared experience tier, verified on-chain at applyForTask. Community tasks skip that gate entirely: anyone joins with a proof-of-participation link, no code required.",
      color: "var(--secondary)",
      icon: "🎯",
    },
    {
      num: "03",
      title: "Work & Get Paid On-Chain",
      desc: "Approve a Development task's submission to release MUSD to one contributor, or pick up to N winners on a Community task and split the escrow between them in one transaction, no intermediary, no counterparty risk.",
      color: "var(--success)",
      icon: "⚡",
    },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>How it works</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--text)" }}>
            Three steps. Zero trust.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-dim)", marginTop: 12, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Escrow, matching, and payment are all enforced by the smart contract itself, not by Taskify.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {steps.map(({ num, title, desc, color, icon }) => (
            <Card key={num} style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -10, fontSize: 80, opacity: 0.04, fontWeight: 900 }}>{num}</div>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.06em", marginBottom: 8 }}>{num}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 12px" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.7, margin: 0 }}>{desc}</p>
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
    { id: 0, label: "Newcomer", years: "0 – 1 year",  color: "var(--text-dim)", bg: "var(--neutral-tint)" },
    { id: 1, label: "Junior",   years: "1 – 2 years", color: "var(--blue)", bg: "color-mix(in srgb, var(--blue-strong) 9%, transparent)" },
    { id: 2, label: "Mid-level",years: "2 – 3 years", color: "var(--secondary-light)", bg: "color-mix(in srgb, var(--secondary) 9%, transparent)" },
    { id: 3, label: "Senior",   years: "3 – 5 years", color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 9%, transparent)" },
    { id: 4, label: "Expert",   years: "5+ years",    color: "var(--gold)", bg: "color-mix(in srgb, var(--gold) 9%, transparent)" },
  ];

  return (
    <section style={{ padding: "96px 24px" }}>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: 1200, margin: "0 auto", gap: 64, alignItems: "center" }}>
        {/* Left */}
        <div>
          <SectionLabel>Experience matching</SectionLabel>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 20px", color: "var(--text)" }}>
            From{" "}
            <span style={{ background: "linear-gradient(90deg, var(--primary), var(--primary-strong))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              "first to apply"
            </span>{" "}
            to "best fit applies"
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.8, margin: "0 0 28px" }}>
            Owners select a minimum and maximum experience tier when posting. Contributors declare their level at registration. The contract verifies the match on-chain when a contributor applies, not just the UI.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Owners", text: "Get applicants who genuinely fit the task scope." },
              { label: "Contributors", text: "See a curated feed of relevant work, not noise." },
              { label: "On-chain", text: "Experience gate is enforced at applyForTask, not filtered away client-side." },
            ].map(({ label, text }) => (
              <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, color: "var(--primary)" }}>
                  <IconCheck />
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{label}: </span>
                  <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: tier ladder */}
        <div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Experience Tiers</div>
            </div>
            {tiers.map((tier, i) => (
              <div key={tier.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: i < tiers.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: tier.bg, border: `1px solid ${tier.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: tier.color }}>
                    {tier.id}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{tier.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{tier.years}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: tier.color, background: tier.bg, padding: "4px 10px", borderRadius: 6, border: `1px solid ${tier.color}30` }}>
                  Tier {tier.id}
                </div>
              </div>
            ))}
            <div style={{ padding: "14px 24px", background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderTop: "1px solid color-mix(in srgb, var(--primary) 9%, transparent)", display: "flex", alignItems: "center", gap: 8 }}>
              <IconShield />
              <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>Gate enforced on-chain, not a UI filter</span>
            </div>
          </Card>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 12, lineHeight: 1.6 }}>
            This gate applies to <strong style={{ color: "var(--text-muted)" }}>Development tasks</strong> only. Community tasks (memes, bug write-ups, social bounties) are open to anyone, no tier required.
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
      color: "var(--primary)",
      bg: "color-mix(in srgb, var(--primary) 9%, transparent)",
      title: "Owner",
      subtitle: "Fund the work",
      desc: "Post a Development task matched by experience tier, or a Community task anyone can join. Lock MUSD in escrow either way.",
      features: [
        "Self-funded, community-grant, or Community (multi-winner) tasks",
        "Experience range picker for Development tasks",
        "Pick up to N winners on Community tasks, payout splits evenly in one transaction",
        "Approve work (or select winners) to release payment",
        "Wave pool rewards for active self-funded owners",
      ],
      cta: "Post a Task",
    },
    {
      icon: <IconUsers />,
      color: "var(--secondary)",
      bg: "color-mix(in srgb, var(--secondary) 9%, transparent)",
      title: "Contributor",
      subtitle: "Get paid to build, or just to show up",
      desc: "GitHub-verified? Apply to experience-matched Development bounties. Just X-linked? Join Community tasks (memes, bug write-ups, social bounties), no code required.",
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
      color: "var(--success)",
      bg: "color-mix(in srgb, var(--success) 9%, transparent)",
      title: "Investor",
      subtitle: "Shape what gets built",
      desc: "Deposit MUSD to fund the grant pool and earn Patron tiers. Vote on grant applications with the veBTC position you already hold on Mezo Earn — funding and voting power are fully decoupled.",
      features: [
        "Permanent MUSD deposits → patron tiers",
        "Voting weight read live from your veBTC lock on Mezo Earn",
        "Vote For / Against grant applications (pilot access)",
        "Bronze → Silver → Gold → Diamond tiers",
        "Taskify never custodies your veBTC — it stays on Mezo Earn",
      ],
      cta: "Become a Patron",
    },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>Who is Taskify for?</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--text)" }}>
            Three roles. One closed-loop economy.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-dim)", marginTop: 12 }}>
            Every participant strengthens the protocol for everyone else.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {roles.map(({ icon, color, bg, title, subtitle, desc, features, cta }) => (
            <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 20 }}>
                {icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{subtitle}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 10px" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.7, margin: "0 0 24px" }}>{desc}</p>
              <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 10, flexGrow: 1 }}>
                {features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--text-muted)" }}>
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
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--text)" }}>
            Every state enforced on-chain
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 32 }}>
          {/* Task lifecycle */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Task Lifecycle (Development)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {states.map((state, i) => (
                <div key={state} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < states.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 20 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === activeIdx ? "var(--primary)" : i < activeIdx ? "var(--success)" : "var(--border)", border: `2px solid ${i === activeIdx ? "var(--primary)" : i < activeIdx ? "var(--success)" : "var(--border-strong)"}`, flexShrink: 0 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: i === activeIdx ? 700 : 500, color: i === activeIdx ? "var(--primary)" : i < activeIdx ? "var(--success)" : "var(--text-faint)" }}>
                    {state}
                  </span>
                  {i === activeIdx && <Badge color="orange">current</Badge>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
              Community tasks skip ASSIGNED / IN_PROGRESS / SUBMITTED entirely: they go straight from OPEN to FUNDS_RELEASED once the owner selects winners.
            </div>
          </Card>

          {/* Fee breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Fee Collection</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Self-funded task fee", rate: "3%", example: "300 MUSD on a 10k task" },
                  { label: "Grant-funded task fee", rate: "5%", example: "500 MUSD on a 10k task" },
                ].map(({ label, rate, example }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{example}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>{rate}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Fee Distribution</div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 6, background: "color-mix(in srgb, var(--primary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>60%</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Platform treasury</div>
                </div>
                <div style={{ flex: 4, background: "color-mix(in srgb, var(--secondary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--secondary-light)" }}>40%</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Owner wave pool</div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
                Wave pool distributes to active self-funded owners every ~30 days, proportional to tasks posted that epoch.
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
    <section id="tokens" style={{ padding: "96px 24px", background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>Native tokens</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--text)" }}>
            MUSD pays. veBTC governs.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-dim)", marginTop: 12 }}>
            Payment and governance are deliberately separate systems — one native to Taskify, one native to Mezo Earn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 24 }}>
          {/* MUSD */}
          <Card style={{ borderColor: "color-mix(in srgb, var(--success) 19%, transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconCoins />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Payment token</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>MUSD</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.7, margin: "0 0 20px" }}>
              Bitcoin-backed stablecoin native to Mezo. The primary escrow currency: contributors know exactly what they earn with zero price exposure.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Locks in escrow at task creation",
                "Releases directly to contributor on approval",
                "Patron pool deposits denominated in MUSD",
                "Wave rewards paid in MUSD",
                "Tasks can also be posted and paid in MEZO",
              ].map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }}><IconCheck /></span>
                  {f}
                </div>
              ))}
            </div>
          </Card>

          {/* veBTC */}
          <Card style={{ borderColor: "color-mix(in srgb, var(--secondary) 19%, transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "color-mix(in srgb, var(--secondary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-light)" }}>
                <IconVote />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--secondary-light)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Governance, read live</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>veBTC</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.7, margin: "0 0 20px" }}>
              Taskify doesn&apos;t custody anything for governance. Lock BTC on Mezo Earn to mint veBTC, and that position's weight is read directly from Mezo&apos;s own contracts every time a grant vote is cast.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Voting weight = your real veBTC position, nothing invented by Taskify",
                "Pair with a veMEZO lock via Mezo's Matching Market to boost weight up to 5×",
                "Each proposal snapshots weight when it opens — late locks can't swing a live vote",
                "Stays on Mezo Earn the whole time; Taskify only ever reads it",
              ].map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--secondary-light)", flexShrink: 0, marginTop: 1 }}><IconCheck /></span>
                  {f}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Voting weight source */}
        <div style={{ marginTop: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Voting weight, on-chain</div>
            <code style={{ fontSize: 15, color: "var(--text)", fontFamily: "var(--font-geist-mono), monospace" }}>
              <span style={{ color: "var(--primary)" }}>getVotingWeight</span>
              {"(patron, proposalSnapshot) → "}
              <span style={{ color: "var(--secondary-light)" }}>veBTC.getPastVotes(...)</span>
            </code>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 320 }}>
            No formula, no multiplier owned by Taskify — a live read straight from Mezo&apos;s Tigris contracts, aggregated across every veBTC position a wallet holds.
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
    a: "Taskify is an on-chain bounty board on Mezo. Owners post tasks and lock MUSD in escrow, contributors apply and get paid on approval, and Patrons fund a community grant pool and vote on which grant-funded tasks get built. Every step (escrow, experience gating, payment) is enforced by the Taskify smart contract, not by a central party.",
  },
  {
    q: "What is MUSD and why does Taskify use it?",
    a: "MUSD is Mezo's native Bitcoin-backed stablecoin. It's the default escrow and payout currency, so contributors know exactly what a bounty is worth with no price exposure between the day a task is posted and the day it's paid out.",
  },
  {
    q: "What is MEZO used for on Taskify?",
    a: "MEZO is Mezo's native token; tasks can be posted and paid in MEZO the same way they can in MUSD. It doesn't grant any voting power on its own — pair a veMEZO lock with a veBTC position via Mezo's Matching Market if you want to boost your governance weight (see \"How does grant voting work?\" below).",
  },
  {
    q: "How does grant voting work?",
    a: "Voting weight comes entirely from your veBTC position on Mezo Earn — lock BTC there to mint veBTC, and Taskify reads that weight live via Mezo's own contracts every time you vote. It's completely decoupled from MUSD deposits: depositing funds the grant pool and earns Patron tiers, but doesn't grant votes. Each proposal snapshots weight at the moment it opens, so locking veBTC after a vote has already started doesn't let you swing it. Grant voting is currently rolling out to an initial group of veBTC holders as the patron base grows.",
  },
  {
    q: "How does experience matching work?",
    a: "Owners set a minimum and maximum experience tier when posting a task. Contributors declare their own tier at registration. The contract itself checks the match when a contributor calls applyForTask, and it's enforced on-chain, not just filtered in the UI.",
  },
  {
    q: "What kind of tasks should I post as an owner?",
    a: "Three broad categories work well: code fixes or changes for developers (Development tasks, experience-tier gated — think \"fix a broken footer layout\" or \"add a loading skeleton to the tasks list\"), social media tasks for the community (Community tasks, open to anyone, no code required — a post, a thread, a meme), and bug bounties or testing for everyone (either type, depending on whether you want it dev-gated or open). Keep bounties small and tightly scoped either way — the amounts on Taskify are modest, so a task a contributor can realistically finish in a few hours to a couple of days gets applicants faster and gets reviewed and paid faster than an open-ended multi-week feature.",
  },
  {
    q: "Can I post a large, multi-week feature as one task?",
    a: "You can, but it's not what the protocol is optimized for. Large scope is better split into several small self-funded tasks, each with its own escrow, applicant, and payout, or posted as a grant-funded task so the community can weigh in on whether the scope and requested amount make sense before any MUSD moves.",
  },
  {
    q: "Is my money safe in escrow?",
    a: "Funds move only through the Taskify contract: MUSD locks in at task creation and only leaves escrow when the owner approves submitted work, when a task is cancelled before assignment, or when a task expires past its deadline. There's no custodial intermediary holding funds at any point.",
  },
  {
    q: "What fees does Taskify take?",
    a: "3% on self-funded tasks, 5% on grant-funded tasks. 60% of every fee goes to the protocol treasury and 40% goes into the wave pool, which is redistributed to active self-funded owners roughly every 30 days.",
  },
  {
    q: "What wallets are supported?",
    a: "Any standard Ethereum wallet via RainbowKit: MetaMask, Rabby, Rainbow, WalletConnect-compatible mobile wallets, or any browser-injected wallet.",
  },
  {
    q: "Has the Taskify contract been audited?",
    a: "The protocol is under active review. Check the repository for the latest audit status before depositing meaningful funds, and always start with amounts you're comfortable testing with.",
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" style={{ padding: "96px 24px", background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>FAQ</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--text)" }}>
            Frequently asked questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_ITEMS.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} style={{ background: "var(--surface)", border: `1px solid ${open ? "color-mix(in srgb, var(--primary) 19%, transparent)" : "var(--border)"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.15s" }}>
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: open ? "var(--primary)" : "var(--text)" }}>{item.q}</span>
                  <span style={{ color: open ? "var(--primary)" : "var(--text-dim)" }}><IconChevron open={open} /></span>
                </button>
                {open && (
                  <div style={{ padding: "0 22px 20px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75 }}>
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
      <div style={{ maxWidth: 960, margin: "0 auto", background: "linear-gradient(135deg, var(--surface) 0%, var(--bg-alt) 100%)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", borderRadius: 24, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <SectionLabel>Get started</SectionLabel>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 20px", color: "var(--text)" }}>
            Start building on Mezo
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-dim)", margin: "0 auto 40px", maxWidth: 480, lineHeight: 1.7 }}>
            Post a task, find work, or invest in the builders shaping the Bitcoin-secured ecosystem.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={connect} style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Post a Task <IconArrow />
            </button>
            <a href="/tasks" style={{ background: "color-mix(in srgb, var(--secondary) 9%, transparent)", color: "var(--secondary-light)", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)", display: "flex", alignItems: "center", gap: 8 }}>
              Find Work
            </a>
            <button onClick={connect} style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
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
      { label: "veBTC voting", href: "#tokens" },
      { label: "Patron tiers", href: "#tokens" },
      { label: "Governance", href: "#tokens" },
    ],
    Legal: [
      { label: "FAQ", href: "#faq" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  };

  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "60px 24px 40px", background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }} className="block sm:grid">
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", position: "relative", flexShrink: 0 }}>
                <Image src="/logo.jpg" alt="Taskify" fill sizes="32px" style={{ objectFit: "cover" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>Taskify</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7, maxWidth: 280, margin: "0 0 16px" }}>
              The on-chain bounty board for the Mezo community. Trustless escrow, community grants, Development and Community tasks alike.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
              <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>Mezo Testnet</span>
            </div>
            <a href="https://x.com/taskifyhq" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", color: "var(--text-dim)" }}
              aria-label="Taskify on X">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>{group}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((item) => (
                  <a key={item.label} href={item.href} style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "none" }}>{item.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
            © 2025 Taskify. Built on <span style={{ color: "var(--primary)" }}>Mezo</span>, secured by Bitcoin.
          </div>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Contract:</span>
            {TASKIFY_ADDRESS ? (
              <a
                href={`${process.env.NEXT_PUBLIC_MEZO_EXPLORER_URL ?? "https://explorer.test.mezo.org"}/address/${TASKIFY_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--primary)", textDecoration: "none" }}
              >
                {formatAddress(TASKIFY_ADDRESS)} ↗
              </a>
            ) : (
              <span style={{ color: "var(--text-dim)" }}>0x…TBD</span>
            )}
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
