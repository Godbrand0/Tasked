export const TIERS = [
  { id: 0, label: "Newcomer", years: "0 – 1 year",  color: "#7070A0", bg: "#FFFFFF0D" },
  { id: 1, label: "Junior",   years: "1 – 2 years", color: "#60A5FA", bg: "#3B82F618" },
  { id: 2, label: "Mid-level",years: "2 – 3 years", color: "#A78BFA", bg: "#7C3AED18" },
  { id: 3, label: "Senior",   years: "3 – 5 years", color: "#F7931A", bg: "#F7931A18" },
  { id: 4, label: "Expert",   years: "5+ years",    color: "#FFD700", bg: "#FFD70018" },
] as const;

export const PATRON_TIERS = [
  { id: 99, label: "None",    min: 0,          color: "#7070A0", bg: "#FFFFFF0D" },
  { id: 0,  label: "Bronze",  min: 100,        color: "#CD7F32", bg: "#CD7F3218" },
  { id: 1,  label: "Silver",  min: 500,        color: "#C0C0C0", bg: "#C0C0C018" },
  { id: 2,  label: "Gold",    min: 1000,       color: "#FFD700", bg: "#FFD70018" },
  { id: 3,  label: "Diamond", min: 5000,       color: "#8B80FF", bg: "#5546FF18" },
] as const;

export const TASK_STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  GRANT_PENDING:  { label: "Grant Pending",  color: "#A78BFA", bg: "#7C3AED18" },
  OPEN:           { label: "Open",           color: "#00D395", bg: "#00D39518" },
  ASSIGNED:       { label: "Assigned",       color: "#60A5FA", bg: "#3B82F618" },
  IN_PROGRESS:    { label: "In Progress",    color: "#F7931A", bg: "#F7931A18" },
  SUBMITTED:      { label: "Submitted",      color: "#FFD700", bg: "#FFD70018" },
  FUNDS_RELEASED: { label: "Completed",      color: "#00D395", bg: "#00D39518" },
  CANCELLED:      { label: "Cancelled",      color: "#7070A0", bg: "#FFFFFF0D" },
  EXPIRED:        { label: "Expired",        color: "#7070A0", bg: "#FFFFFF0D" },
  GRANT_REJECTED: { label: "Grant Rejected", color: "#F87171", bg: "#EF444418" },
};

export const MUSD_DECIMALS = 18;

// Official Mezo contract addresses (source: mezo.org/docs/users/resources/contracts-reference).
// MEZO has no published testnet deployment — on testnet we deploy our own
// MockMEZO (see contracts/script/Deploy.s.sol) and point NEXT_PUBLIC_MEZO_CONTRACT
// at it; on mainnet the real MEZO address below applies.
export const CONTRACT_ADDRESSES = {
  testnet: {
    musd: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
    mezo: undefined as string | undefined,
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
