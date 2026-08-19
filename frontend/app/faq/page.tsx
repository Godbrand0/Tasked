"use client";

import Link from "next/link";
import { useState } from "react";

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface FaqItem { q: string; a: string }
interface FaqGroup { group: string; items: FaqItem[] }

const FAQ_GROUPS: FaqGroup[] = [
  {
    group: "Protocol basics",
    items: [
      {
        q: "What is Taskify?",
        a: "Taskify is an on-chain bounty board on Mezo. Creators post tasks and lock MUSD in escrow, contributors apply and get paid on approval, and Patrons fund a community grant pool and vote on which grant-funded tasks get built. Every step (escrow, experience gating, payment) is enforced by the Taskify smart contract, not by a central party.",
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
        q: "Is my money safe in escrow?",
        a: "Funds move only through the Taskify contract: MUSD locks in at task creation and only leaves escrow when the creator approves submitted work, when a task is cancelled before assignment, or when a task expires past its deadline. There's no custodial intermediary holding funds at any point.",
      },
      {
        q: "What fees does Taskify take?",
        a: "3% on self-funded tasks, 5% on grant-funded tasks. 60% of every fee goes to the protocol treasury and 40% goes into the wave pool, which is redistributed to active self-funded creators roughly every 30 days.",
      },
      {
        q: "What wallets are supported?",
        a: "Any standard Ethereum wallet via RainbowKit: MetaMask, Rabby, Rainbow, WalletConnect-compatible mobile wallets, or any browser-injected wallet.",
      },
      {
        q: "Has the Taskify contract been audited?",
        a: "The protocol is under active review. Check the repository for the latest audit status before depositing meaningful funds, and always start with amounts you're comfortable testing with.",
      },
    ],
  },
  {
    group: "Posting and finding work",
    items: [
      {
        q: "How does experience matching work?",
        a: "Creators set a minimum and maximum experience tier when posting a task. Contributors declare their own tier at registration. The contract itself checks the match when a contributor calls applyForTask, and it's enforced on-chain, not just filtered in the UI.",
      },
      {
        q: "What kind of tasks should I post as a creator?",
        a: "Three broad categories work well: code fixes or changes for developers (Development tasks, experience-tier gated — think \"fix a broken footer layout\" or \"add a loading skeleton to the tasks list\"), social media tasks for the community (Community tasks, open to anyone, no code required — a post, a thread, a meme), and bug bounties or testing for everyone (either type, depending on whether you want it dev-gated or open). Keep bounties small and tightly scoped either way — the amounts on Taskify are modest, so a task a contributor can realistically finish in a few hours to a couple of days gets applicants faster and gets reviewed and paid faster than an open-ended multi-week feature.",
      },
      {
        q: "Can I post a large, multi-week feature as one task?",
        a: "You can, but it's not what the protocol is optimized for. Large scope is better split into several small self-funded tasks, each with its own escrow, applicant, and payout, or posted as a grant-funded task so the community can weigh in on whether the scope and requested amount make sense before any MUSD moves.",
      },
    ],
  },
  {
    group: "Account, GitHub & X",
    items: [
      {
        q: "Do I need to connect GitHub or X? What are the benefits?",
        a: "No — neither is required to use Taskify's core features. You can register, browse and apply for tasks, post tasks, and deposit as a Patron with just a wallet. That said, both are worth connecting: GitHub verification (real OAuth, in Settings) is the strongest signal a creator has that a Development-task applicant is a real, working developer, and it's what most creators look for before assigning work — it also shows your actual GitHub handle instead of a raw wallet address across the app. X verification links your handle to your profile and to any proof-of-participation link you submit on Community tasks, which creators use to vet submissions before picking winners; a submission tied to a verified handle is easier to trust than an anonymous link, even though it isn't a hard requirement to join.",
      },
      {
        q: "I linked GitHub/X but it's not showing as verified — what happened?",
        a: "GitHub verification is backed by a real OAuth flow, so it should update immediately after you authorize it in Settings; try disconnecting and reconnecting if it's stuck. X verification is currently self-declared rather than backed by live OAuth, so it's set the moment you link a handle in Settings.",
      },
    ],
  },
  {
    group: "Grant voting",
    items: [
      {
        q: "How does grant voting work?",
        a: "Voting weight comes entirely from your veBTC position on Mezo Earn — lock BTC there to mint veBTC, and Taskify reads that weight live via Mezo's own contracts every time you vote. It's completely decoupled from MUSD deposits: depositing funds the grant pool and earns Patron tiers, but doesn't grant votes. Each proposal snapshots weight at the moment it opens, so locking veBTC after a vote has already started doesn't let you swing it.",
      },
      {
        q: "How can I become a voter?",
        a: "Grant voting is currently in an invite-only pilot phase while the patron base grows. Holding real veBTC weight is necessary but not sufficient on its own — Taskify additionally maintains an approved-voter list, and only wallets on that list can cast a vote, even if they hold veBTC. If you hold veBTC and want to be considered for the pilot, reach out via X (@taskifyhq).",
      },
    ],
  },
  {
    group: "Supporting Taskify",
    items: [
      {
        q: "How can I support Taskify?",
        a: "A few ways, depending on what you have to offer: become a Patron by depositing MUSD into the grant pool (funds grant-approved tasks and unlocks Patron tiers), lock BTC into veBTC via Mezo Earn (grows real governance weight behind grant voting), post real tasks so there's work on the board, apply for and complete tasks as a contributor, or simply spread the word — follow @taskifyhq on X and share tasks you post or complete.",
      },
    ],
  },
  {
    group: "Notifications & email",
    items: [
      {
        q: "I'm not getting notification emails — what should I check?",
        a: "First, check Settings → Notification Preferences to confirm email notifications are turned on for the event types you care about (they're on by default, but can be toggled off individually). If they're on and you still don't see anything, check your Spam/Junk folder — new senders, including Taskify's notification address, commonly land there the first few times a mail provider sees them. If you find one there, mark it \"Not spam\" (Gmail) or \"Not junk\" (Outlook) rather than just moving it to your inbox — that's what actually retrains your provider's filter for future emails, instead of only fixing this one. It also helps other people: mail providers weigh how often a sender gets reported as legitimate versus reported as spam when deciding whether to keep flagging that sender, so marking a genuine Taskify email as \"not spam\" helps keep it out of spam for other users at the same provider too, not just you.",
      },
    ],
  },
];

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>("Protocol basics:0");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px" }}>
        <Link href="/" style={{ color: "var(--text-dim)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to Taskify
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Frequently Asked Questions
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 40px" }}>
          Still stuck? Reach out via <a href="https://x.com/taskifyhq" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>@taskifyhq on X</a>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {FAQ_GROUPS.map((group) => (
            <div key={group.group}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
                {group.group}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {group.items.map((item, i) => {
                  const key = `${group.group}:${i}`;
                  const open = openKey === key;
                  return (
                    <div key={item.q} style={{ background: "var(--surface)", border: `1px solid ${open ? "color-mix(in srgb, var(--primary) 19%, transparent)" : "var(--border)"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.15s" }}>
                      <button
                        onClick={() => setOpenKey(open ? null : key)}
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
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 48, paddingTop: 24 }}>
          <Link href="/terms" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Read the Terms &amp; Conditions →</Link>
        </div>
      </div>
    </div>
  );
}
