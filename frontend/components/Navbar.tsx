"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useWallet, formatAddress, formatBalance } from "@/lib/wallet-context";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/ui/NotificationBell";
import BackButton from "@/components/ui/BackButton";

const NAV_LINKS = [
  { href: "/tasks", label: "Browse Tasks" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const ROLE_COLOR: Record<string, string> = {
  creator:     "var(--primary)",
  contributor: "var(--secondary-light)",
  investor:    "var(--success)",
};

const ROLE_DASHBOARD: Record<string, string> = {
  creator:     "/creator",
  contributor: "/contributor",
  investor:    "/investor",
};

function TaskedLogo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0, position: "relative" }}>
        <Image src="/logo.jpg" alt="Taskify" fill sizes="32px" style={{ objectFit: "cover" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 20, color: "var(--text)", letterSpacing: "-0.02em" }}>Taskify</span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, isRegistered, username, role, address, musdBalance, mezoBalance, githubAvatar, connect, disconnect } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const roleColor = role ? ROLE_COLOR[role] : "var(--text-muted)";
  const dashboardHref = role ? ROLE_DASHBOARD[role] : "/register";

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", background: "color-mix(in srgb, var(--bg) 92%, transparent)", borderBottom: "1px solid var(--border)" }}>
      <style>{`
        .nav-link:hover { color: var(--text) !important; }
        .nav-btn-outline:hover { border-color: color-mix(in srgb, var(--primary) 50%, transparent) !important; color: var(--text) !important; }
        .nav-btn-primary:hover { background: var(--primary-strong) !important; }
        .wallet-dropdown-item:hover { background: var(--border) !important; }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackButton />
          <TaskedLogo />
        </div>

        {/* Desktop nav links */}
        <div style={{ alignItems: "center", gap: 32 }} className="hidden sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="nav-link"
              style={{ color: pathname === href ? "var(--text)" : "var(--text-muted)", fontSize: 14, fontWeight: pathname === href ? 600 : 500, textDecoration: "none", transition: "color 0.15s" }}>
              {label}
            </Link>
          ))}
          {/* Post Task only visible to creators */}
          {isRegistered && role === "creator" && (
            <Link href="/create" className="nav-link"
              style={{ color: pathname === "/create" ? "var(--primary)" : "var(--text-muted)", fontSize: 14, fontWeight: pathname === "/create" ? 600 : 500, textDecoration: "none", transition: "color 0.15s" }}>
              Post Task
            </Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          {!connected ? (
            /* Not connected: connect + launch (Connect Wallet text button hidden on mobile — Launch App does the same thing) */
            <>
              <button onClick={connect} className="nav-btn-outline hidden sm:flex"
                style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500, padding: "8px 16px", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
                Connect Wallet
              </button>
              <button onClick={connect} className="nav-btn-primary"
                style={{ background: "var(--primary)", color: "var(--bg)", fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
                Launch App
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </>
          ) : !isRegistered ? (
            /* Connected, not registered */
            <>
              <div className="hidden sm:flex" style={{ alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-geist-mono)", color: "var(--text-dim)", padding: "6px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)" }} />
                {formatAddress(address)}
              </div>
              <Link href="/register" style={{ background: "var(--primary)", color: "var(--bg)", fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 8, border: "none", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                Launch App
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </>
          ) : (
            /* Registered: MUSD + MEZO balances (desktop only), notifications, profile avatar */
            <>
              <div className="hidden sm:flex" style={{ alignItems: "center", gap: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: "var(--success)" }}>{formatBalance(musdBalance)}</span>
                <span style={{ color: "color-mix(in srgb, var(--text-faint) 50%, transparent)" }}>MUSD</span>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span style={{ color: "var(--secondary-light)" }}>{formatBalance(mezoBalance)}</span>
                <span style={{ color: "color-mix(in srgb, var(--text-faint) 50%, transparent)" }}>MEZO</span>
              </div>

              <NotificationBell />

              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  title={username}
                  style={{ width: 38, height: 38, borderRadius: "50%", background: githubAvatar ? "var(--surface-2)" : `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`, border: `2px solid ${roleColor}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "white", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s", overflow: "hidden", position: "relative", padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = roleColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${roleColor}50`)}
                >
                  {githubAvatar ? (
                    <Image src={githubAvatar} alt={username} fill sizes="38px" style={{ objectFit: "cover" }} />
                  ) : (
                    (username || "?").charAt(0).toUpperCase()
                  )}
                </button>

                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 8, minWidth: 220, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", zIndex: 100 }}>
                    {/* Identity header */}
                    <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{username}</span>
                        {role && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: `${roleColor}18`, padding: "2px 7px", borderRadius: 4, border: `1px solid ${roleColor}30` }}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "color-mix(in srgb, var(--text-faint) 50%, transparent)" }}>{address}</div>
                    </div>

                    {/* Nav items */}
                    {[
                      { label: "My Dashboard", href: dashboardHref, icon: "🎯" },
                      { label: "Settings", href: "/settings", icon: "⚙️" },
                    ].map(({ label, href, icon }) => (
                      <Link key={href} href={href} className="wallet-dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "var(--text-soft)", textDecoration: "none", transition: "background 0.1s" }}>
                        <span>{icon}</span>{label}
                      </Link>
                    ))}

                    <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6 }}>
                      <button
                        onClick={() => { disconnect(); setDropdownOpen(false); router.push("/"); }}
                        className="wallet-dropdown-item"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "var(--danger)", background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", transition: "background 0.1s" }}>
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
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              style={{ padding: "10px 12px", borderRadius: 8, color: pathname === href ? "var(--text)" : "var(--text-muted)", background: pathname === href ? "var(--surface)" : "transparent", fontSize: 15, fontWeight: pathname === href ? 600 : 500, textDecoration: "none" }}>
              {label}
            </Link>
          ))}
          {isRegistered && role === "creator" && (
            <Link href="/create"
              style={{ padding: "10px 12px", borderRadius: 8, color: pathname === "/create" ? "var(--primary)" : "var(--text-muted)", background: pathname === "/create" ? "var(--surface)" : "transparent", fontSize: 15, fontWeight: pathname === "/create" ? 600 : 500, textDecoration: "none" }}>
              Post Task
            </Link>
          )}
          {connected && !isRegistered && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-geist-mono)", color: "var(--text-dim)", padding: "10px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)" }} />
              {formatAddress(address)}
            </div>
          )}
          {connected && isRegistered && (
            <>
              <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--success)" }}>{formatBalance(musdBalance)}</span>
                <span style={{ color: "color-mix(in srgb, var(--text-faint) 50%, transparent)" }}>MUSD</span>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span style={{ color: "var(--secondary-light)" }}>{formatBalance(mezoBalance)}</span>
                <span style={{ color: "color-mix(in srgb, var(--text-faint) 50%, transparent)" }}>MEZO</span>
              </div>
              <Link href={dashboardHref} style={{ padding: "10px 12px", borderRadius: 8, color: "var(--text-soft)", fontSize: 15, textDecoration: "none" }}>🎯 My Dashboard</Link>
              <Link href="/settings" style={{ padding: "10px 12px", borderRadius: 8, color: "var(--text-soft)", fontSize: 15, textDecoration: "none" }}>⚙️ Settings</Link>
              <button
                onClick={() => { disconnect(); router.push("/"); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, fontSize: 15, color: "var(--danger)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                Disconnect
              </button>
            </>
          )}
          {!connected && (
            <button onClick={connect} style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
              Connect Wallet
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
