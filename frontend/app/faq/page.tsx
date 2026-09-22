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
    group: "The basics",
    items: [
      {
        q: "What is Taskify?",
        a: "Taskify is a bounty board built on Mezo. Creators post tasks and lock MUSD in escrow, contributors apply and get paid on approval, and Patrons fund a community grant pool and vote on which grant-funded tasks get built. Every step (escrow, experience gating, payment) is enforced automatically by Taskify itself, not by a central party.",
      },
      {
        q: "What is MUSD and why does Taskify use it?",
        a: "MUSD is Mezo's native Bitcoin-backed stablecoin. It's the default escrow and payout currency, so contributors know exactly what a bounty is worth with no price exposure between the day a task is posted and the day it's paid out.",
      },
      {
        q: "What is MEZO used for on Taskify?",
        a: "MEZO is Mezo's native token; tasks can be posted and paid in MEZO the same way they can in MUSD. It doesn't grant any voting power on its own; pair a veMEZO lock with a veBTC position via Mezo's Matching Market if you want to boost your governance weight (see \"How does grant voting work?\" below).",
      },
      {
        q: "Is my money safe in escrow?",
        a: "Funds move only through Taskify itself: MUSD locks in at task creation and only leaves escrow when the creator approves submitted work, when a task is cancelled before assignment, or when a task expires past its deadline. There's no intermediary holding funds at any point, and no admin function that can pull funds out of an escrow. One thing to be aware of: the contract is upgradeable, and an upgrade could in principle change those rules — which is why upgrade authority sits with a 2-of-3 multisig that includes an independent Mezo community signer, not a single team wallet. See \"Governance & who controls the contract\" below for the full picture.",
      },
      {
        q: "What fees does Taskify take?",
        a: "3% on self-funded tasks, 5% on grant-funded tasks. 60% of every fee goes to the Taskify treasury and 40% goes into the wave pool, which is redistributed to active self-funded creators roughly every 30 days.",
      },
      {
        q: "What wallets are supported?",
        a: "Any standard Ethereum wallet via RainbowKit: MetaMask, Rabby, Rainbow, WalletConnect-compatible mobile wallets, or any browser-injected wallet.",
      },
      {
        q: "Has Taskify been audited?",
        a: "Three security reviews so far — two internal and one external automated scan — and every finding from all three has been resolved. The most serious, from the September 2026 review, was that a single key held upgrade authority over live funds; that was closed by moving ownership to a 2-of-3 Safe multisig. But be clear on the caveat: none of these was a professional third-party audit. A paid independent audit is planned before the contract holds larger sums, and until then you should treat the reviews as necessary but not sufficient and start with amounts you're comfortable testing with. The full findings are on the Docs page under Security reviews.",
      },
    ],
  },
  {
    group: "Posting and finding work",
    items: [
      {
        q: "How does experience matching work?",
        a: "Creators set a minimum and maximum experience tier when posting a task. Contributors declare their own tier at registration. Taskify itself checks the match the moment a contributor applies — it's enforced automatically, not just filtered away in the interface.",
      },
      {
        q: "What kind of tasks should I post as a creator?",
        a: "Three broad categories work well: code fixes or changes for developers (Development tasks, experience-tier gated: think \"fix a broken footer layout\" or \"add a loading skeleton to the tasks list\"), social media tasks for the community (Community tasks, open to anyone, no code required: a post, a thread, a meme), and bug bounties or testing for everyone (either type, depending on whether you want it dev-gated or open). Keep bounties small and tightly scoped either way; the amounts on Taskify are modest, so a task a contributor can realistically finish in a few hours to a couple of days gets applicants faster and gets reviewed and paid faster than an open-ended multi-week feature.",
      },
      {
        q: "Can I post a large, multi-week feature as one task?",
        a: "You can, but it's not what Taskify is optimized for. Large scope is better split into several small self-funded tasks, each with its own escrow, applicant, and payout, or posted as a grant-funded task so the community can weigh in on whether the scope and requested amount make sense before any MUSD moves.",
      },
    ],
  },
  {
    group: "Account, GitHub & X",
    items: [
      {
        q: "Do I need to connect GitHub or X? What are the benefits?",
        a: "No, neither is required to use Taskify's core features. You can register, browse and apply for tasks, post tasks, and deposit as a Patron with just a wallet — though every action on Taskify needs a small amount of BTC for network fees (see \"Do I need BTC to use Taskify?\" under Wallet safety). That said, both are worth connecting: GitHub verification (real OAuth, in Settings) is the strongest signal a creator has that a Development-task applicant is a real, working developer, and it's what most creators look for before assigning work; it also shows your actual GitHub handle instead of a raw wallet address across the app. X verification links your handle to your profile and to any proof-of-participation link you submit on Community tasks, which creators use to vet submissions before picking winners; a submission tied to a verified handle is easier to trust than an anonymous link, even though it isn't a hard requirement to join.",
      },
      {
        q: "I linked GitHub/X but it's not showing as verified. What happened?",
        a: "GitHub verification is backed by a real OAuth flow, so it should update immediately after you authorize it in Settings; try disconnecting and reconnecting if it's stuck. X verification is currently self-declared rather than backed by live OAuth, so it's set the moment you link a handle in Settings.",
      },
    ],
  },
  {
    group: "Wallet safety",
    items: [
      {
        q: "Which wallet should I connect when I register?",
        a: "Use a self-custody wallet you personally hold the seed phrase for — never an exchange-custodied address, and a hardware wallet for anything holding real value. If you plan to vote on grants, connect the exact address that holds your veBTC: your voting weight is read from that specific address live via Mezo's own system, so registering with a different wallet leaves you with zero weight even if you hold veBTC elsewhere.",
      },
      {
        q: "Do I need BTC to use Taskify?",
        a: "Yes — a little. Every action on Mezo (registering, applying, submitting work, joining a Community task) costs a small amount of BTC in network fees, separate from the MUSD you earn or escrow. If you register as a contributor with a brand-new, empty wallet, Taskify covers a one-time top-up automatically — registration just works, and it's enough to get you through your first several actions. After that you cover network fees yourself: earn MUSD on a task and swap a sliver to BTC, or bring BTC over from elsewhere on Mezo.",
      },
      {
        q: "Will Taskify ever ask for my seed phrase or private key?",
        a: "Never. Taskify only ever asks your wallet to sign transactions and approvals through its normal popup. Nobody from Taskify will DM you asking for a seed phrase, private key, or \"wallet validation\" — anyone who does is a scammer. Report and block them.",
      },
      {
        q: "What am I approving when I sign a token approval?",
        a: "Taskify only ever requests an approval for the exact amount you're about to escrow or deposit in that transaction — never an unlimited or max approval. Read every signature prompt before you sign and check the spender is Taskify itself and the amount matches what you expect. If a prompt asks for an unlimited allowance, cancel it.",
      },
      {
        q: "How do I make sure I'm on the real Taskify site?",
        a: "Bookmark the official URL and use the bookmark every time. Don't reach Taskify through links in DMs, replies, ads, or search results — those are the most common phishing vectors. The only official account is @taskifyhq on X.",
      },
    ],
  },
  {
    group: "Grant voting",
    items: [
      {
        q: "How does grant voting work?",
        a: "Voting weight comes entirely from your veBTC position on Mezo Earn; lock BTC there to mint veBTC, and Taskify reads that weight live from Mezo's own system every time you vote. It's completely decoupled from MUSD deposits: depositing funds the grant pool and earns Patron tiers, but doesn't grant votes. Each proposal snapshots weight at the moment it opens, so locking veBTC after a vote has already started doesn't let you swing it.",
      },
      {
        q: "How can I become a voter?",
        a: "Grant voting is currently in an invite-only pilot phase while the patron base grows. Holding real veBTC weight is necessary but not sufficient on its own; Taskify additionally maintains an approved-voter list, and only wallets on that list can cast a vote, even if they hold veBTC. If you hold veBTC and want to be considered for the pilot, reach out via X (@taskifyhq).",
      },
    ],
  },
  {
    group: "Governance & who controls the contract",
    items: [
      {
        q: "Who controls the Taskify contract?",
        a: "A 2-of-3 Safe multisig on safe.mezo.org, at 0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31. No single person can change anything: at least two of the three signers must approve before any administrative action or contract upgrade takes effect. The contract used to be owned by a single team wallet; ownership was moved to the multisig in September 2026 after a security review flagged that as the most serious risk.",
      },
      {
        q: "Who are the three signers?",
        a: "One is a member of the Mezo g6 community, independent of the Taskify team (0x68Fe50235230e24f17c90f8Fb0Cd4626fbD34972), and two are Taskify core team members (0x91487d8BC1B573f0BC6c23dE7BA23d50F49F627B and 0x4344c919B6b104Cd06b93fa31c9dB7FB659B8E64). Because the threshold is 2 of 3, the two team signers can reach it between themselves — the independent signer raises the bar and adds outside visibility, but doesn't yet make team action impossible. We'd rather state that plainly than oversell it. You can verify the signer set yourself by calling getOwners() and getThreshold() on the Safe address.",
      },
      {
        q: "Can the team take my escrowed funds?",
        a: "No. There is no function in the contract that lets the owner — multisig or otherwise — withdraw, move or release funds locked in a task escrow. Escrowed funds leave only through the normal lifecycle: the creator approves submitted work, the task is cancelled before assignment, or it expires past its deadline. The owner also can't spend the grant pool outside an executed, community-approved grant, can't change a vote's outcome, and can't redirect the MUSD or MEZO token addresses (those are immutable).",
      },
      {
        q: "What can the multisig actually do?",
        a: "Five things: upgrade the contract, change the treasury address that receives the protocol fee share, set which Mezo contracts veBTC and veMEZO voting weight is read from, approve wallets for the grant-voting pilot, and hand ownership to a new address (a two-step transfer). The upgrade power is the significant one, because a UUPS upgrade can change any rule in the contract, including rules that govern escrowed funds. That's the tradeoff for being able to ship security fixes quickly, and it's why upgrade authority sits behind a multisig rather than one key.",
      },
      {
        q: "Is there a timelock on upgrades?",
        a: "Not yet, and this is a real limitation worth knowing about. Once two signers approve an upgrade it takes effect immediately, with no enforced delay in which users could withdraw first. Adding a timelock on upgrades is on the roadmap. Until it ships, please size your exposure accordingly — see the Terms for the formal statement of this risk.",
      },
      {
        q: "What did the September 2026 security review find?",
        a: "Four findings: one High, two Medium, one Low. All four are resolved. The High was that a single key held upgrade authority over live funds — closed by moving ownership to the multisig. The two Mediums were that ownership transfer was single-step (a mistyped address would have permanently locked every admin function) and that conflicting storage-gap guidance could have silently corrupted state during a future upgrade; both are fixed in the deployed code. The Low was a few wei of rounding dust stranded per wave reward, also fixed. Worth noting what the review also tested and found sound: wave-reward over-payment and escrow commingling were both specifically investigated and disproved. Full detail is on the Docs page under Security reviews.",
      },
      {
        q: "How do I verify any of this for myself?",
        a: "Don't take our word for it. On the Mezo explorer, read CONTRACT_OWNER() and treasuryAddress() on the Taskify contract — both should return the Safe address 0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31. Then read getOwners() and getThreshold() on that Safe: you should see three owners and a threshold of 2. Every Safe transaction, including every upgrade, is also visible on-chain and in the Safe's own history at safe.mezo.org.",
      },
    ],
  },
  {
    group: "Supporting Taskify",
    items: [
      {
        q: "How can I support Taskify?",
        a: "A few ways, depending on what you have to offer: become a Patron by depositing MUSD into the grant pool (funds grant-approved tasks and unlocks Patron tiers), lock BTC into veBTC via Mezo Earn (grows real governance weight behind grant voting), post real tasks so there's work on the board, apply for and complete tasks as a contributor, or simply spread the word; follow @taskifyhq on X and share tasks you post or complete.",
      },
    ],
  },
  {
    group: "Notifications & email",
    items: [
      {
        q: "I'm not getting notification emails. What should I check?",
        a: "First, check Settings → Notification Preferences to confirm email notifications are turned on for the event types you care about (they're on by default, but can be toggled off individually). If they're on and you still don't see anything, check your Spam/Junk folder; new senders, including Taskify's notification address, commonly land there the first few times a mail provider sees them. If you find one there, mark it \"Not spam\" (Gmail) or \"Not junk\" (Outlook) rather than just moving it to your inbox; that's what actually retrains your provider's filter for future emails, instead of only fixing this one. It also helps other people: mail providers weigh how often a sender gets reported as legitimate versus reported as spam when deciding whether to keep flagging that sender, so marking a genuine Taskify email as \"not spam\" helps keep it out of spam for other users at the same provider too, not just you.",
      },
    ],
  },
];

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>("The basics:0");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px" }}>
        <Link href="/" style={{ color: "var(--text-dim)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to Taskify
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Frequently Asked Questions
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "justify", margin: "0 0 40px" }}>
          Still stuck? Reach out via <a href="https://x.com/taskifyhq" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>@taskifyhq on X</a>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {FAQ_GROUPS.map((group) => (
            <div key={group.group} id={group.group.toLowerCase().replace(/[^a-z0-9]+/g, "-")} style={{ scrollMarginTop: 24 }}>
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

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 48, paddingTop: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/terms" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Read the Terms &amp; Conditions →</Link>
          <Link href="/privacy" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Privacy Policy →</Link>
        </div>
      </div>
    </div>
  );
}
