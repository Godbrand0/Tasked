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
  FUNDS_RELEASED: { label: "Completed",      color: "var(--success)", bg: "color-mix(in srgb, var(--success) 9%, transparent)" },
  CANCELLED:      { label: "Cancelled",      color: "var(--text-dim)", bg: "var(--neutral-tint)" },
  EXPIRED:        { label: "Expired",        color: "var(--text-dim)", bg: "var(--neutral-tint)" },
  GRANT_REJECTED: { label: "Grant Rejected", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger-strong) 9%, transparent)" },
};

export const MUSD_DECIMALS = 18;

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

// Mock/demo data stores amounts as plain human-readable numbers (not raw
// base units) since 18-decimal raw integers exceed JS's safe integer range.
// Real on-chain reads should use viem's formatUnits(raw, MUSD_DECIMALS).
export function formatMUSD(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function getTier(id: number) {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

export function getPatronTier(id: number) {
  return PATRON_TIERS.find((t) => t.id === id) ?? PATRON_TIERS[0];
}
