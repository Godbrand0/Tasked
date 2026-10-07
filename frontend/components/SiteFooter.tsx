"use client";

import Image from "next/image";
import Link from "next/link";
import Address from "@/components/ui/Address";
import { IconGithub, IconShield } from "@/components/icons";
import { MEZO_EXPLORER_URL, MEZO_NETWORK_NAME } from "@/lib/constants";
import { TASKIFY_ADDRESS } from "@/lib/taskify";
import { formatAddress } from "@/lib/wallet-context";

// One footer for every page (rendered once from app/layout.tsx). It carries
// what every visitor should see each time: how to reach the team, where the
// rules and the contract live, and a standing safety notice.

const X_URL = "https://x.com/taskifyhq";
const TELEGRAM_URL = "https://t.me/+W1fXHQWioTA2ZDlk";
const GITHUB_URL = "https://github.com/Godbrand0/Tasked";

interface FooterLink { label: string; href: string; external?: boolean }

const GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Browse tasks", href: "/tasks" },
      { label: "Post a task", href: "/create" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Wave rewards", href: "/wave" },
      { label: "Wallet", href: "/wallet" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Support the grant pool", href: "/support" },
      { label: "Vote on grants", href: "/vote" },
      { label: "X (@taskifyhq)", href: X_URL, external: true },
      { label: "Telegram", href: TELEGRAM_URL, external: true },
      { label: "GitHub", href: GITHUB_URL, external: true },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "How it works", href: "/docs" },
      { label: "FAQ", href: "/faq" },
      { label: "Wallet safety", href: "/faq#wallet-safety" },
      { label: "Sending tokens", href: "/faq#sending-tokens" },
    ],
  },
  {
    title: "Trust & legal",
    links: [
      { label: "Governance & multisig", href: "/docs#governance" },
      { label: "Security reviews", href: "/docs#security-reviews" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

const linkStyle: React.CSSProperties = { fontSize: 13, color: "var(--text-dim)", textDecoration: "none" };

function FooterAnchor({ link }: { link: FooterLink }) {
  return link.external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className="site-footer-link" style={linkStyle}>
      {link.label} ↗
    </a>
  ) : (
    <Link href={link.href} className="site-footer-link" style={linkStyle}>{link.label}</Link>
  );
}

const socialStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34,
  borderRadius: 8, border: "1px solid var(--border)", color: "var(--text-dim)",
};

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg-alt)", marginTop: "auto" }}>
      {/* Standing safety notice: shown on every page, every time */}
      <div style={{ background: "color-mix(in srgb, var(--gold) 9%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--gold) 22%, transparent)" }}>
        <div className="page-container" style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }}><IconShield size={16} /></span>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", textAlign: "left" }}>
            <strong style={{ color: "var(--text)" }}>Stay safe.</strong> Taskify will never ask for your seed phrase or private key, and
            transactions on Mezo are final: check the address and amount before you sign.{" "}
            <Link href="/faq#wallet-safety" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>Wallet safety →</Link>
          </p>
        </div>
      </div>

      <div className="page-container" style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 24px 28px" }}>
        <div className="site-footer-grid">
          {/* Brand */}
          <div className="site-footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", position: "relative", flexShrink: 0 }}>
                <Image src="/logo.jpg" alt="Taskify" fill sizes="32px" style={{ objectFit: "cover" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>Taskify</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7, maxWidth: 300, margin: "0 0 14px", textAlign: "left" }}>
              The trustless bounty board for the Mezo community: secure escrow, community grants, and tasks anyone can do.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
              <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>{MEZO_NETWORK_NAME}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Taskify on X" className="site-footer-link" style={socialStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Taskify on Telegram" className="site-footer-link" style={socialStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21.944 4.667a1.44 1.44 0 0 0-1.47-.245L3.36 11.06c-.9.354-.885 1.64.02 1.973l4.263 1.567 1.65 5.303c.196.63 1 .81 1.446.325l2.377-2.586 4.28 3.155c.53.39 1.29.1 1.43-.55l3.06-14.2a1.44 1.44 0 0 0-.522-1.373zM9.9 14.38l7.06-4.45c.13-.082.26.096.15.2l-5.83 5.42a.9.9 0 0 0-.28.53l-.2 1.98c-.02.16-.24.18-.29.03z" /></svg>
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="Taskify on GitHub" className="site-footer-link" style={socialStyle}>
                <IconGithub size={15} />
              </a>
            </div>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>{group.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {group.links.map((link) => <FooterAnchor key={link.label} link={link} />)}
              </div>
            </nav>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 36, paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
            © {new Date().getFullYear()} Taskify. Built on <span style={{ color: "var(--primary)" }}>Mezo</span>, secured by Bitcoin.
          </div>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span>Contract:</span>
            {TASKIFY_ADDRESS ? (
              <Address value={TASKIFY_ADDRESS}>
                <a href={`${MEZO_EXPLORER_URL}/address/${TASKIFY_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>
                  {formatAddress(TASKIFY_ADDRESS)} ↗
                </a>
              </Address>
            ) : (
              <span style={{ color: "var(--text-dim)" }}>not configured</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
