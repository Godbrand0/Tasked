"use client";

import Link from "next/link";

interface DocSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

const MEZO_EARN_URL = "https://mezo.org/earn";

const SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Overview",
    body: (
      <>
        <p>
          Taskify is an on-chain bounty board on Mezo. Owners post tasks and lock MUSD (or MEZO) in escrow,
          contributors apply and get paid on approval, and Patrons fund a shared grant pool and vote on which
          grant-funded tasks get built.
        </p>
        <p>
          Every step that matters — escrow, experience gating, payout, voting weight — is enforced by the Taskify
          smart contract itself, not by a central party. Nobody, including the Taskify team, can move escrowed
          funds outside the paths the contract allows.
        </p>
      </>
    ),
  },
  {
    id: "task-types",
    title: "Task types",
    body: (
      <>
        <p>Every task is one of two kinds, chosen at creation and fixed for its lifetime:</p>
        <ul>
          <li>
            <strong>Development</strong> — a single contributor applies, the Owner picks one assignee from the
            applicants, and the full escrow (minus fee) releases to them when their submission is approved. Gated by
            an experience-tier range the Owner sets.
          </li>
          <li>
            <strong>Community</strong> — open to any registered wallet, no experience gate. Anyone joins with a
            proof-of-participation link (a post, a write-up, a PR — whatever the task asks for). The Owner reviews
            submissions off-chain and picks up to <code>maxWinners</code> addresses; the escrow splits evenly between
            them in one transaction.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "funding-types",
    title: "Funding types & fees",
    body: (
      <>
        <p>Development tasks can be funded one of two ways:</p>
        <ul>
          <li>
            <strong>Self-funded</strong> — the Owner deposits the full bounty themselves at creation. 3% protocol
            fee.
          </li>
          <li>
            <strong>Grant-funded</strong> — the Owner proposes the task with no upfront deposit. If patrons approve
            it by vote (see below), MUSD is drawn from the shared grant pool automatically. 5% protocol fee.
          </li>
        </ul>
        <p>Community tasks are always self-funded (3%) — grant-funded Community tasks aren&apos;t supported yet.</p>
        <p>Every fee splits the same way: 60% to the protocol treasury, 40% into the current wave pool.</p>
      </>
    ),
  },
  {
    id: "lifecycle",
    title: "Task lifecycle",
    body: (
      <>
        <p>A task moves through a fixed set of on-chain statuses. The exact path depends on how it&apos;s funded and what kind it is:</p>
        <p style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 13, lineHeight: 2, color: "var(--text-muted)" }}>
          Development, self-funded:<br />
          Open → Assigned → In Progress → Submitted → Payment Released<br />
          (Open can also go to Cancelled or Expired; Submitted can go back to Open via a rejected submission.)
          <br /><br />
          Development, grant-funded:<br />
          Grant Pending → (vote) → Open → Assigned → In Progress → Submitted → Payment Released<br />
          (Grant Pending resolves to either Open, on approval, or Grant Rejected.)
          <br /><br />
          Community:<br />
          Open → Payment Released (via selectWinners, once)<br />
          (Open can also go to Cancelled or Expired before any winners are picked.)
        </p>
        <p>
          A creator can <strong>cancel</strong> a self-funded task before it&apos;s assigned, refunded minus the fee.
          Anyone can call <strong>markExpired</strong> on a task past its deadline that hasn&apos;t reached Submitted
          — this never touches work that&apos;s already been delivered or a grant proposal that was never funded.
        </p>
      </>
    ),
  },
  {
    id: "experience",
    title: "Experience tiers",
    body: (
      <>
        <p>
          Contributors declare a tier at registration (self-attested, changeable once a day). Development tasks set
          a minimum and maximum tier at creation — the contract checks the match on-chain when a contributor calls
          <code> applyForTask</code>, not just in the UI.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-dim)" }}>
              <th style={{ padding: "6px 8px" }}>Tier</th>
              <th style={{ padding: "6px 8px" }}>Experience</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Newcomer", "0 – 1 year"],
              ["Junior", "1 – 2 years"],
              ["Mid-level", "2 – 3 years"],
              ["Senior", "3 – 5 years"],
              ["Expert", "5+ years"],
            ].map(([label, years]) => (
              <tr key={label} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px", fontWeight: 600, color: "var(--text)" }}>{label}</td>
                <td style={{ padding: "8px", color: "var(--text-dim)" }}>{years}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Community tasks skip the experience gate entirely — anyone registered can join.</p>
      </>
    ),
  },
  {
    id: "voting",
    title: "Grant voting & veBTC",
    body: (
      <>
        <p>
          Taskify doesn&apos;t custody anything for governance. Voting weight is read live from your{" "}
          <strong>veBTC</strong> position on{" "}
          <a href={MEZO_EARN_URL} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Mezo Earn</a>
          {" "}— lock BTC there to mint veBTC, and pair it with a veMEZO lock via Mezo&apos;s Matching Market to boost
          weight up to 5x. It&apos;s completely decoupled from MUSD deposits: depositing into the pool funds grants
          and earns Patron tiers, but grants no votes on its own.
        </p>
        <p>
          Each grant proposal opens a 3-day voting window and fixes a snapshot — both the timestamp and the veBTC
          contract address — the moment it opens. Locking veBTC after a vote has started doesn&apos;t let you swing
          it, and the snapshot can&apos;t be affected by a later change to which contract Taskify reads from.
        </p>
        <p>
          A proposal passes at <strong>70%</strong> support of cast weight. Grant voting is currently in an
          invite-only pilot: holding real veBTC weight is necessary but not sufficient — only wallets the project
          owner has explicitly approved can cast a vote. Reach out via{" "}
          <a href="https://x.com/taskifyhq" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>@taskifyhq</a>{" "}
          if you hold veBTC and want to be considered.
        </p>
      </>
    ),
  },
  {
    id: "patrons",
    title: "Patron tiers & wave rewards",
    body: (
      <>
        <p>
          Any registered wallet can deposit MUSD into the shared grant pool (minimum 50 MUSD), independent of role or
          voting status. Cumulative deposits unlock a tier:
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-dim)" }}>
              <th style={{ padding: "6px 8px" }}>Tier</th>
              <th style={{ padding: "6px 8px" }}>Total deposited</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Bronze", "100+ MUSD"],
              ["Silver", "500+ MUSD"],
              ["Gold", "1,000+ MUSD"],
              ["Diamond", "5,000+ MUSD"],
            ].map(([label, min]) => (
              <tr key={label} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px", fontWeight: 600, color: "var(--text)" }}>{label}</td>
                <td style={{ padding: "8px", color: "var(--text-dim)" }}>{min}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Separately, every self-funded task&apos;s fee sends 40% into a rolling <strong>wave</strong> pool. Every 30
          days, the wave closes and that pool splits among the wave&apos;s self-funded creators, proportional to how
          many tasks each one posted — a small ongoing incentive for creators who keep the board active. Grant-funded
          tasks contribute fees to the wave pool too, but don&apos;t count toward any creator&apos;s share.
        </p>
      </>
    ),
  },
  {
    id: "safety",
    title: "Escrow & wallet safety",
    body: (
      <>
        <p>
          Funds move only through the Taskify contract: MUSD or MEZO locks in at task creation and only leaves escrow
          when the Owner approves submitted work, a task is cancelled before assignment, or a task expires past its
          deadline. There&apos;s no custodial intermediary holding funds at any point, and Taskify only ever requests
          an approval for the exact amount about to be escrowed — never unlimited.
        </p>
        <p>
          For wallet setup and phishing-safety guidance, see the{" "}
          <Link href="/faq#wallet-safety" style={{ color: "var(--primary)" }}>Wallet safety</Link> section of the
          FAQ.
        </p>
      </>
    ),
  },
];

export default function DocsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]" style={{ maxWidth: 960, margin: "0 auto", padding: "56px 24px 96px", gap: 48 }}>
        {/* Sidebar nav */}
        <div>
          <Link href="/" style={{ color: "var(--text-dim)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            ← Back to Taskify
          </Link>
          <nav className="hidden lg:block" style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 4 }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "none", padding: "6px 10px", borderRadius: 8 }}>
                {s.title}
              </a>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            How Taskify works
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 40px" }}>
            The full protocol reference. For quick answers, see the{" "}
            <Link href="/faq" style={{ color: "var(--primary)", textDecoration: "none" }}>FAQ</Link> instead.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {SECTIONS.map(s => (
              <section key={s.id} id={s.id} style={{ scrollMarginTop: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 16px", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                  {s.title}
                </h2>
                <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8 }} className="docs-body">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 48, paddingTop: 24, display: "flex", gap: 20 }}>
            <Link href="/faq" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Read the FAQ →</Link>
            <Link href="/terms" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Terms &amp; Conditions →</Link>
          </div>
        </div>
      </div>

      <style>{`
        .docs-body p { margin: 0 0 14px; }
        .docs-body ul { margin: 0 0 14px; padding-left: 20px; }
        .docs-body li { margin-bottom: 8px; }
        .docs-body code { background: var(--neutral-tint); border-radius: 4px; padding: 1px 6px; font-size: 12px; }
      `}</style>
    </div>
  );
}
