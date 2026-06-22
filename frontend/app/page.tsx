// Landing page — Server Component, no interactivity needed

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

function Navbar() {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", background: "rgba(10,10,15,0.85)", borderBottom: "1px solid #1E1E2A" }}>
      <style>{`.tasked-nav-link:hover { color: #F0F0F5 !important; }`}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #F7931A, #C4711A)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20, color: "#F0F0F5", letterSpacing: "-0.02em" }}>Tasked</span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden sm:flex">
          {["How it works", "Features", "Docs", "Leaderboard"].map((link) => (
            <a key={link} href="#" className="tasked-nav-link" style={{ color: "#9090B0", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.15s" }}>
              {link}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="#" style={{ color: "#9090B0", fontSize: 14, fontWeight: 500, textDecoration: "none", padding: "8px 16px" }}>
            Sign in
          </a>
          <a href="#" style={{ background: "#F7931A", color: "#0A0A0F", fontSize: 14, fontWeight: 700, textDecoration: "none", padding: "8px 18px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
            Launch App <IconArrow />
          </a>
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
        Build Stacks DeFi Analytics Dashboard
      </h3>
      <p style={{ fontSize: 13, color: "#7070A0", margin: "0 0 16px", lineHeight: 1.5 }}>
        React frontend connecting to the Stacks API to display protocol TVL, volume, and token stats.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge color="orange">500 USDX</Badge>
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
  return (
    <section style={{ padding: "96px 24px 80px", position: "relative", overflow: "hidden" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "radial-gradient(ellipse, rgba(247,147,26,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 100, right: 100, width: 400, height: 400, background: "radial-gradient(ellipse, rgba(85,70,255,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="block sm:grid">
        {/* Left */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <Badge color="orange">
              <span style={{ fontSize: 10 }}>⛓</span> Built on Stacks · Bitcoin-secured
            </Badge>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 24px", color: "#F0F0F5" }}>
            The On-Chain{" "}
            <span style={{ background: "linear-gradient(90deg, #F7931A, #FFB347)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Bounty Board
            </span>{" "}
            for Stacks Builders
          </h1>
          <p style={{ fontSize: 18, color: "#9090B0", lineHeight: 1.7, margin: "0 0 36px", maxWidth: 480 }}>
            Post tasks, lock USDX in escrow, match contributors by experience level — all enforced by Clarity contracts. No trust required.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#" style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
              Post a Task <IconArrow />
            </a>
            <a href="#" style={{ background: "transparent", color: "#F0F0F5", fontWeight: 600, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", border: "1px solid #1E1E2A", display: "flex", alignItems: "center", gap: 8 }}>
              Find Work
            </a>
          </div>
          <div style={{ marginTop: 36, display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { val: "3%", label: "Protocol fee" },
              { val: "7-day", label: "Wave rewards" },
              { val: "5 tiers", label: "Experience matching" },
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
            USDX locked in escrow
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
    { icon: <IconShield />, label: "Clarity contracts" },
    { icon: <IconGithub />, label: "GitHub-verified" },
    { icon: <IconLock />, label: "Trustless escrow" },
    { icon: <IconCoins />, label: "USDX + STX native" },
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
      desc: "Post a task, set the experience range required, choose USDX or STX — the token locks in the smart contract the moment the task goes live. No trust required from either side.",
      color: "#F7931A",
      icon: "🔒",
    },
    {
      num: "02",
      title: "Experience-Matched Apply",
      desc: "Contributors see only tasks matching their declared experience tier. When they apply, the Clarity contract verifies the match on-chain — not just in the UI.",
      color: "#5546FF",
      icon: "🎯",
    },
    {
      num: "03",
      title: "Work & Get Paid On-Chain",
      desc: "Once the creator approves submitted work, the contract releases USDX directly to the contributor's principal. No intermediary, no delay, no counterparty risk.",
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
            Every action — escrow, matching, payment — is enforced by the Clarity contract, not by Tasked.
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
            Creators select a minimum and maximum experience tier when posting. Contributors declare their level at registration. The Clarity contract verifies the match when a contributor applies — not just the UI.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Creators", text: "Get applicants who genuinely fit the task scope." },
              { label: "Contributors", text: "See a curated feed of relevant work, not noise." },
              { label: "On-chain", text: "Experience gate is enforced at apply-for-task, not filtered away client-side." },
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
              <span style={{ fontSize: 12, color: "#F7931A", fontWeight: 600 }}>Gate enforced on-chain by Clarity — not a UI filter</span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

// ─── User Roles ───────────────────────────────────────────────────────────────

function RolesSection() {
  const roles = [
    {
      icon: <IconCode />,
      color: "#F7931A",
      bg: "#F7931A18",
      title: "Creator",
      subtitle: "Fund the work",
      desc: "Post tasks, lock USDX in escrow, set the experience range, and choose from matched applicants.",
      features: [
        "Self-funded or community-grant tasks",
        "Experience range picker (min → max tier)",
        "GitHub-linked project identity",
        "Approve work to release payment",
        "Weekly wave pool rewards for active creators",
      ],
      cta: "Post a Task",
    },
    {
      icon: <IconUsers />,
      color: "#5546FF",
      bg: "#5546FF18",
      title: "Contributor",
      subtitle: "Get paid to build",
      desc: "Browse experience-matched bounties, apply on-chain, complete work, and build a permanent on-chain reputation.",
      features: [
        "Experience-matched task feed",
        "GitHub-verified identity",
        "Permanent on-chain task history",
        "Portable reputation (USDX earned + tasks done)",
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
      desc: "Deposit USDX into the patron pool, stake STX for amplified governance weight, and vote on grant applications.",
      features: [
        "Permanent USDX deposits → patron tiers",
        "STX staking boosts voting weight 10×",
        "Vote For / Against grant applications",
        "Bronze → Silver → Gold → Diamond tiers",
        "No lockup for STX stake — always withdrawable",
      ],
      cta: "Become a Patron",
    },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>Who is Tasked for?</SectionLabel>
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
              <a href="#" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, background: bg, border: `1px solid ${color}30`, color, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                {cta} <IconArrow />
              </a>
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
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Task Lifecycle</div>
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
          </Card>

          {/* Fee breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Fee Collection</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Self-funded task fee", rate: "3%", example: "300 USDX on a 10k task" },
                  { label: "Grant-funded task fee", rate: "5%", example: "500 USDX on a 10k task" },
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
                Wave pool distributes to active creators every ~7 days, proportional to tasks posted that epoch.
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
    <section style={{ padding: "96px 24px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SectionLabel>Native tokens</SectionLabel>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#F0F0F5" }}>
            USDX pays. STX governs.
          </h2>
          <p style={{ fontSize: 16, color: "#7070A0", marginTop: 12 }}>
            Both tokens are native to the Stacks ecosystem. Neither is speculative filler.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* USDX */}
          <Card style={{ borderColor: "#00D39530" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#00D39518", border: "1px solid #00D39530", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconCoins />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#00D395", letterSpacing: "0.06em", textTransform: "uppercase" }}>Payment token</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5" }}>USDX</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.7, margin: "0 0 20px" }}>
              Bitcoin-backed stablecoin native to Stacks. The primary escrow currency — contributors know exactly what they earn with zero price exposure.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Locks in escrow at task creation",
                "Releases directly to contributor on approval",
                "Patron pool deposits denominated in USDX",
                "Wave rewards paid in USDX",
                "Multi-token tasks supported via SIP-010",
              ].map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#9090B0" }}>
                  <span style={{ color: "#00D395", flexShrink: 0, marginTop: 1 }}><IconCheck /></span>
                  {f}
                </div>
              ))}
            </div>
          </Card>

          {/* STX */}
          <Card style={{ borderColor: "#5546FF30" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#5546FF18", border: "1px solid #5546FF30", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B80FF" }}>
                <IconVote />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8B80FF", letterSpacing: "0.06em", textTransform: "uppercase" }}>Governance token</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5" }}>STX</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.7, margin: "0 0 20px" }}>
              Native Stacks token. Stake STX to amplify voting weight on grant applications — turning passive holders into active ecosystem governors.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "1 STX staked = 10 USDX governance weight",
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
              <span style={{ color: "#00D395" }}>total-usdx-deposited</span>
              {" + ("}
              <span style={{ color: "#8B80FF" }}>stx-staked</span>
              {" × "}
              <span style={{ color: "#F7931A" }}>10</span>
              {" / 1e6)"}
            </code>
          </div>
          <div style={{ fontSize: 13, color: "#7070A0", maxWidth: 320 }}>
            Staking 1,000 STX adds 10,000 USDX-equivalent voting units. Capital commitment and ecosystem conviction both shape governance.
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", background: "linear-gradient(135deg, #111116 0%, #16121A 100%)", border: "1px solid #F7931A28", borderRadius: 24, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(247,147,26,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <SectionLabel>Get started</SectionLabel>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 20px", color: "#F0F0F5" }}>
            Start building on Stacks
          </h2>
          <p style={{ fontSize: 17, color: "#7070A0", margin: "0 auto 40px", maxWidth: 480, lineHeight: 1.7 }}>
            Post a task, find work, or invest in the builders shaping the Bitcoin-secured ecosystem.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#" style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
              Post a Task <IconArrow />
            </a>
            <a href="#" style={{ background: "#5546FF18", color: "#8B80FF", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", border: "1px solid #5546FF30", display: "flex", alignItems: "center", gap: 8 }}>
              Find Work
            </a>
            <a href="#" style={{ background: "#00D39518", color: "#00D395", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none", border: "1px solid #00D39530", display: "flex", alignItems: "center", gap: 8 }}>
              Become a Patron
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const links = {
    Protocol: ["How it works", "Task escrow", "Grant pool", "Wave rewards"],
    Builders: ["Browse tasks", "Leaderboard", "Docs", "GitHub"],
    Tokens: ["USDX", "STX staking", "Patron tiers", "Governance"],
  };

  return (
    <footer style={{ borderTop: "1px solid #1E1E2A", padding: "60px 24px 40px", background: "#0D0D12" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #F7931A, #C4711A)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, color: "#F0F0F5" }}>Tasked</span>
            </div>
            <p style={{ fontSize: 13, color: "#7070A0", lineHeight: 1.7, maxWidth: 280, margin: "0 0 16px" }}>
              The on-chain bounty board for Stacks builders. Trustless escrow, community grants, experience-matched work.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D395" }} />
              <span style={{ fontSize: 12, color: "#00D395", fontWeight: 600 }}>Stacks Testnet</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F0F0F5", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>{group}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((item) => (
                  <a key={item} href="#" style={{ fontSize: 13, color: "#7070A0", textDecoration: "none" }}>{item}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #1E1E2A", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#505070" }}>
            © 2025 Tasked. Built on <span style={{ color: "#F7931A" }}>Stacks</span>, secured by Bitcoin.
          </div>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#505070", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Contract:</span>
            <span style={{ color: "#7070A0" }}>ST…TBD.tasked</span>
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
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <ExperienceSection />
      <RolesSection />
      <ProtocolSection />
      <TokensSection />
      <CTASection />
      <Footer />
    </div>
  );
}
