"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/tasks",       label: "Browse Tasks" },
  { href: "/create",      label: "Post Task" },
  { href: "/leaderboard", label: "Leaderboard" },
];

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
  const [menuOpen, setMenuOpen] = useState(false);

  // Mock wallet state — replace with real Stacks Connect
  const connected = false;

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", background: "rgba(10,10,15,0.9)", borderBottom: "1px solid #1E1E2A" }}>
      <style>{`
        .nav-link:hover { color: #F0F0F5 !important; }
        .nav-btn:hover { background: #F7931A !important; color: #0A0A0F !important; }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <TaskedLogo />

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="nav-link" style={{ color: pathname === href ? "#F0F0F5" : "#9090B0", fontSize: 14, fontWeight: pathname === href ? 600 : 500, textDecoration: "none", transition: "color 0.15s" }}>
              {label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {connected ? (
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, background: "#111116", border: "1px solid #1E1E2A", borderRadius: 8, padding: "7px 14px", textDecoration: "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D395" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F5" }}>satoshi.btc</span>
            </Link>
          ) : (
            <>
              <Link href="/register" style={{ color: "#9090B0", fontSize: 14, fontWeight: 500, textDecoration: "none", padding: "8px 16px" }}>
                Sign in
              </Link>
              <Link href="/register" className="nav-btn" style={{ background: "#F7931A22", color: "#F7931A", fontSize: 14, fontWeight: 700, textDecoration: "none", padding: "8px 18px", borderRadius: 8, border: "1px solid #F7931A40", transition: "all 0.15s" }}>
                Connect Wallet
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
