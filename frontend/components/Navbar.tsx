"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useWallet, formatAddress, formatBalance } from "@/lib/wallet-context";

const NAV_LINKS = [
  { href: "/tasks", label: "Browse Tasks" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const ROLE_COLOR: Record<string, string> = {
  creator:     "#F7931A",
  contributor: "#8B80FF",
  investor:    "#00D395",
};

const ROLE_DASHBOARD: Record<string, string> = {
  creator:     "/creator",
  contributor: "/contributor",
  investor:    "/investor",
};

function TaskedLogo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #F7931A, #C4711A)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
        </svg>
      </div>
      <span style={{ fontWeight: 700, fontSize: 20, color: "#F0F0F5", letterSpacing: "-0.02em" }}>Tasked</span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, isRegistered, username, role, address, stxBalance, connect, disconnect } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const roleColor = role ? ROLE_COLOR[role] : "#9090B0";
  const dashboardHref = role ? ROLE_DASHBOARD[role] : "/register";

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", background: "rgba(10,10,15,0.92)", borderBottom: "1px solid #1E1E2A" }}>
      <style>{`
        .nav-link:hover { color: #F0F0F5 !important; }
        .nav-btn-outline:hover { border-color: #F7931A80 !important; color: #F0F0F5 !important; }
        .nav-btn-primary:hover { background: #E8851A !important; }
        .wallet-dropdown-item:hover { background: #1E1E2A !important; }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <TaskedLogo />

        {/* Desktop nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="nav-link"
              style={{ color: pathname === href ? "#F0F0F5" : "#9090B0", fontSize: 14, fontWeight: pathname === href ? 600 : 500, textDecoration: "none", transition: "color 0.15s" }}>
              {label}
            </Link>
          ))}
          {/* Post Task only visible to creators */}
          {isRegistered && role === "creator" && (
            <Link href="/create" className="nav-link"
              style={{ color: pathname === "/create" ? "#F7931A" : "#9090B0", fontSize: 14, fontWeight: pathname === "/create" ? 600 : 500, textDecoration: "none", transition: "color 0.15s" }}>
              Post Task
            </Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!connected ? (
            /* Not connected: connect + launch */
            <>
              <button onClick={connect} className="nav-btn-outline"
                style={{ color: "#9090B0", fontSize: 14, fontWeight: 500, padding: "8px 16px", background: "transparent", border: "1px solid #2E2E3A", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
                Connect Wallet
              </button>
              <button onClick={connect} className="nav-btn-primary"
                style={{ background: "#F7931A", color: "#0A0A0F", fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
                Launch App
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </>
          ) : !isRegistered ? (
            /* Connected, not registered */
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-geist-mono)", color: "#7070A0", padding: "6px 12px", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00D395" }} />
                {formatAddress(address)}
              </div>
              <Link href="/register" style={{ background: "#F7931A", color: "#0A0A0F", fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 8, border: "none", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                Launch App
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </>
          ) : (
            /* Registered: STX balance + profile avatar */
            <>
              <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: "#8B80FF" }}>{formatBalance(stxBalance)}</span>
                <span style={{ color: "#50507080", marginLeft: 4 }}>STX</span>
              </div>

              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  title={username}
                  style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`, border: `2px solid ${roleColor}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "white", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = roleColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${roleColor}50`)}
                >
                  {(username || "?").charAt(0).toUpperCase()}
                </button>

                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 8, minWidth: 220, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", zIndex: 100 }}>
                    {/* Identity header */}
                    <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid #1E1E2A", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{username}</span>
                        {role && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: `${roleColor}18`, padding: "2px 7px", borderRadius: 4, border: `1px solid ${roleColor}30` }}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "#50507080" }}>{address}</div>
                    </div>

                    {/* Nav items */}
                    {[
                      { label: "My Dashboard", href: dashboardHref, icon: "🎯" },
                      { label: "Settings", href: "/settings", icon: "⚙️" },
                    ].map(({ label, href, icon }) => (
                      <Link key={href} href={href} className="wallet-dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "#C0C0D0", textDecoration: "none", transition: "background 0.1s" }}>
                        <span>{icon}</span>{label}
                      </Link>
                    ))}

                    <div style={{ borderTop: "1px solid #1E1E2A", marginTop: 6, paddingTop: 6 }}>
                      <button
                        onClick={() => { disconnect(); setDropdownOpen(false); router.push("/"); }}
                        className="wallet-dropdown-item"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "#F87171", background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", transition: "background 0.1s" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
