// Display label for each on-chain role — "creator" stays the internal
// string everywhere (variables, API fields, role comparisons); this is
// only what gets shown to users.
export const ROLE_LABELS: Record<"creator" | "contributor", string> = {
  creator: "Owner",
  contributor: "Contributor",
};

export const TIERS = [
  { id: 0, label: "Newcomer", years: "0 – 1 year",  color: "var(--text-dim)", bg: "var(--neutral-tint)" },
  { id: 1, label: "Junior",   years: "1 – 2 years", color: "var(--blue)", bg: "color-mix(in srgb, var(--blue-strong) 9%, transparent)" },
  { id: 2, label: "Mid-level",years: "2 – 3 years", color: "var(--secondary-light)", bg: "color-mix(in srgb, var(--secondary) 9%, transparent)" },
  { id: 3, label: "Senior",   years: "3 – 5 years", color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 9%, transparent)" },
  { id: 4, label: "Expert",   years: "5+ years",    color: "var(--gold)", bg: "color-mix(in srgb, var(--gold) 9%, transparent)" },
] as const;

export const PATRON_TIERS = [
  { id: 99, label: "None",    min: 0,          color: "var(--text-dim)", bg: "var(--neutral-tint)" },
  { id: 0,  label: "Bronze",  min: 100,        color: "#CD7F32", bg: "#CD7F3218" },
  { id: 1,  label: "Silver",  min: 500,        color: "#C0C0C0", bg: "#C0C0C018" },
  { id: 2,  label: "Gold",    min: 1000,       color: "var(--gold)", bg: "color-mix(in srgb, var(--gold) 9%, transparent)" },
  { id: 3,  label: "Diamond", min: 5000,       color: "var(--secondary-light)", bg: "color-mix(in srgb, var(--secondary) 9%, transparent)" },
] as const;

export const TASK_STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  GRANT_PENDING:  { label: "Grant Pending",  color: "var(--secondary-light)", bg: "color-mix(in srgb, var(--secondary) 9%, transparent)" },
  OPEN:           { label: "Open",           color: "var(--success)", bg: "color-mix(in srgb, var(--success) 9%, transparent)" },
  ASSIGNED:       { label: "Assigned",       color: "var(--blue)", bg: "color-mix(in srgb, var(--blue-strong) 9%, transparent)" },
  IN_PROGRESS:    { label: "In Progress",    color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 9%, transparent)" },
  SUBMITTED:      { label: "Submitted",      color: "var(--gold)", bg: "color-mix(in srgb, var(--gold) 9%, transparent)" },
  FUNDS_RELEASED: { label: "Payment Released", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 9%, transparent)" },
  CANCELLED:      { label: "Cancelled",      color: "var(--text-dim)", bg: "var(--neutral-tint)" },
  EXPIRED:        { label: "Expired",        color: "var(--text-dim)", bg: "var(--neutral-tint)" },
  GRANT_REJECTED: { label: "Grant Rejected", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger-strong) 9%, transparent)" },
};

export const MUSD_DECIMALS = 18;

// Defaults to Mezo mainnet; override NEXT_PUBLIC_MEZO_CHAIN_ID for testnet
// (31611) or a custom devnet. Single source of truth for the "which Mezo
// network is this" display label — see app/providers.tsx (wallet-facing
// chain config) and any UI that shows the connected network name.
export const MEZO_CHAIN_ID = Number(process.env.NEXT_PUBLIC_MEZO_CHAIN_ID ?? 31612);
export const MEZO_IS_TESTNET = MEZO_CHAIN_ID === 31611;
export const MEZO_NETWORK_NAME = MEZO_IS_TESTNET ? "Mezo Testnet" : "Mezo";

// Official Mezo contract addresses (source: mezo.org/docs/users/resources/contracts-reference).
// MEZO has no published testnet deployment — on testnet we deploy our own
// MockMEZO (see contracts/script/Deploy.s.sol) and point NEXT_PUBLIC_MEZO_CONTRACT
// at it; on mainnet the real MEZO address below applies.
export const CONTRACT_ADDRESSES = {
  testnet: {
    musd: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
    // Same address as mainnet — MEZO turns out to be deployed there too.
    mezo: "0x7B7c000000000000000000000000000000000001",
  },
  mainnet: {
    musd: "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186",
    mezo: "0x7B7c000000000000000000000000000000000001",
  },
} as const;

// Governance — the Safe multisig that owns the mainnet Taskify proxy. Since
// 2026-09-16 `CONTRACT_OWNER` and `treasuryAddress` are both this Safe, not the
// deployer EOA, so every admin call and every UUPS upgrade needs 2 of 3 signers.
// Kept here as the single source of truth for the public-facing governance copy
// on /docs, /faq, /terms and the landing page. Verify against the chain before
// editing: `CONTRACT_OWNER()` on the proxy, `getOwners()`/`getThreshold()` on
// the Safe.
export const GOVERNANCE = {
  safeAddress: "0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31",
  safeAppUrl: "https://safe.mezo.org",
  threshold: 2,
  signers: [
    { role: "Mezo community representative (g6)", address: "0x68Fe50235230e24f17c90f8Fb0Cd4626fbD34972" },
    { role: "Taskify core team (deployer)", address: "0x91487d8BC1B573f0BC6c23dE7BA23d50F49F627B" },
    { role: "Taskify core team", address: "0x4344c919B6b104Cd06b93fa31c9dB7FB659B8E64" },
  ],
} as const;

// Security reviews — single source of truth for the public review record on
// /docs#security-reviews, the landing page and the FAQ. Three rounds so far,
// all findings resolved. None of these is a professional third-party audit;
// say so wherever this data is rendered. Full write-ups live in
// TASKIFY_SECURITY_AUDIT.md (rounds 1-2) and SECURITY-REVIEW-2026-09-17
// (round 3, not published — it carries an internal/confidential marking).
export const SECURITY_REVIEWS = {
  rounds: [
    {
      name: "Round 1 — internal manual review",
      date: "August 2026",
      scope: "Line-by-line pass over the full contract",
      result: "1 High, 1 Medium, 2 Low — all fixed, each with a regression test",
    },
    {
      name: "Round 2 — external automated scan",
      date: "August 2026",
      scope: "Automated analysis of the task lifecycle",
      result: "7 findings — all fixed, each with a regression test",
    },
    {
      name: "Round 3 — internal review",
      date: "September 2026",
      scope:
        "UUPS upgradeability and live mainnet operations — the areas rounds 1 and 2 predated",
      result: "1 High, 2 Medium, 1 Low — all resolved",
    },
  ],
  // Round 3 in detail: it is the review that produced the multisig migration,
  // so its findings are the ones users are most likely to ask about.
  latest: {
    date: "September 2026",
    commit: "main @ e13205d",
    verification: "45 Foundry tests passing; 5 purpose-written proof-of-concept tests executed",
    findings: [
      {
        severity: "High",
        title: "A single key held upgrade authority over live funds",
        detail:
          "The contract owner on mainnet was one externally-owned account. That key alone could have replaced the implementation and drained escrow.",
        resolution:
          "Resolved on-chain by transferring ownership and the treasury to the Safe multisig. No single key can authorise an upgrade any more.",
      },
      {
        severity: "Medium",
        title: "Ownership transfer was single-step and irreversible",
        detail:
          "transferOwnership moved authority in one transaction without proving the destination could actually sign. A mistyped or undeployed address would have locked every admin function permanently.",
        resolution:
          "Resolved in code. Transfers are now two-step: the current owner nominates, and the new owner must call acceptOwnership from that address before authority moves.",
      },
      {
        severity: "Medium",
        title: "Storage-gap guidance contradicted the demonstrated upgrade pattern",
        detail:
          "Two conflicting upgrade conventions coexisted in the repository. Following the wrong one during a future upgrade could have silently corrupted live storage — no compiler warning, no failing test.",
        resolution:
          "Resolved in code. One convention is now stated unambiguously in the contract, and a committed storage-layout test fails the build on any slot shift.",
      },
      {
        severity: "Low",
        title: "Wave reward rounding stranded dust",
        detail:
          "Floor division left a remainder of a few wei per wave with no way to withdraw it. Sub-cent amounts, no attacker control.",
        resolution:
          "Resolved in code. The final claimant of a wave now receives the remainder, matching the pattern the payout path already used.",
      },
    ],
    alsoTested: [
      "Wave reward over-payment — tested and disproved",
      "Escrow commingling between tasks and the wave pool — tested and disproved",
      "Upgrade initialisation front-running — blocked, covered by tests",
      "State continuity across an upgrade — confirmed intact",
      "Token approval scoping — no admin function can touch a third party's allowance",
    ],
  },
} as const;

export const MEZO_EXPLORER_URL = MEZO_IS_TESTNET
  ? "https://explorer.test.mezo.org"
  : "https://explorer.mezo.org";

// Mock/demo data stores amounts as plain human-readable numbers (not raw
// base units) since 18-decimal raw integers exceed JS's safe integer range.
// Real on-chain reads should use viem's formatUnits(raw, MUSD_DECIMALS).
export function formatMUSD(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// User.totalEarned on-chain is a single counter that both approveAndRelease
// and selectWinners add raw payout amounts to regardless of token — MUSD and
// MEZO payouts land in the same number, which is why it can never be safely
// labeled "MUSD" once a contributor has earned any MEZO. Recompute a proper
// per-token breakdown from actual completed-task data instead, which does
// carry the correct token per task.
export function earnedByToken(tasks: { amount: number; token: string }[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of tasks) totals[t.token] = (totals[t.token] ?? 0) + t.amount;
  return totals;
}

export function formatEarnedBreakdown(tasks: { amount: number; token: string }[]): string {
  const entries = Object.entries(earnedByToken(tasks));
  if (entries.length === 0) return "0 MUSD";
  return entries.map(([token, amt]) => `${formatMUSD(amt)} ${token}`).join(" + ");
}

export function getTier(id: number) {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

export function getPatronTier(id: number) {
  return PATRON_TIERS.find((t) => t.id === id) ?? PATRON_TIERS[0];
}
