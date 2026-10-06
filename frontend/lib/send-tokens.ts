import { formatUnits, getAddress, isAddress, parseUnits, zeroAddress } from "viem";

// Pure helpers for the /wallet send form — no React, no network — so the
// rules that stop a user losing funds can be reasoned about (and tested) alone.

export type SendToken = "MUSD" | "MEZO";
export const SEND_TOKENS: SendToken[] = ["MUSD", "MEZO"];
// MUSD and MEZO are both 18 decimals on Mezo (checked on-chain).
export const TOKEN_DECIMALS = 18;

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Validates a recipient. `blocked` maps lowercase addresses that must never
 * receive a transfer (the token contracts, the Taskify contract) to the reason —
 * those would swallow the funds permanently. Mixed-case input must carry a valid
 * EIP-55 checksum (viem enforces this), which catches most typos.
 */
export function validateRecipient(
  input: string,
  opts: { self?: string; blocked?: Record<string, string> } = {},
): Result<{ address: `0x${string}` }> {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Enter a recipient address." };
  if (!isAddress(raw)) return { ok: false, error: "That isn't a valid address (check for typos or a bad checksum)." };
  const address = getAddress(raw);
  const lc = address.toLowerCase();
  if (lc === zeroAddress) return { ok: false, error: "That's the zero address — funds sent there are lost forever." };
  if (opts.self && lc === opts.self.toLowerCase()) return { ok: false, error: "That's your own address." };
  const reason = opts.blocked?.[lc];
  if (reason) return { ok: false, error: reason };
  return { ok: true, address };
}

/** Parses a human amount to base units without ever touching floating point. */
export function parseTokenAmount(input: string, balance: bigint): Result<{ value: bigint }> {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Enter an amount." };
  if (!/^\d*\.?\d*$/.test(raw) || raw === ".") return { ok: false, error: "Enter a valid number." };
  const [, frac = ""] = raw.split(".");
  if (frac.length > TOKEN_DECIMALS) return { ok: false, error: `At most ${TOKEN_DECIMALS} decimal places.` };
  const value = parseUnits(raw.startsWith(".") ? `0${raw}` : raw, TOKEN_DECIMALS);
  if (value <= BigInt(0)) return { ok: false, error: "Amount must be greater than zero." };
  if (value > balance) return { ok: false, error: "That's more than your balance." };
  return { ok: true, value };
}

/** Exact decimal string for an input field (e.g. the Max button). */
export function toInputAmount(raw: bigint): string {
  return formatUnits(raw, TOKEN_DECIMALS);
}

/** Display string: up to `maxDp` decimals, trailing zeros trimmed, thousands separators. */
export function formatTokenAmount(raw: bigint, maxDp = 6): string {
  const [whole, frac = ""] = formatUnits(raw, TOKEN_DECIMALS).split(".");
  const trimmed = frac.slice(0, maxDp).replace(/0+$/, "");
  const w = BigInt(whole).toLocaleString();
  return trimmed ? `${w}.${trimmed}` : w;
}

/** Splits an address into 4-char groups so it's checkable by eye on the confirm step. */
export function chunkAddress(address: string): string[] {
  const body = address.slice(2);
  const parts: string[] = [];
  for (let i = 0; i < body.length; i += 4) parts.push(body.slice(i, i + 4));
  return ["0x", ...parts];
}

/**
 * Friendly label for why a transfer happened, from the contract method the
 * explorer reports. Direction matters: createTask can send escrow out AND hand
 * a small amount back in the same transaction, so "Task escrow" only fits the
 * outgoing leg; payouts and refunds only fit the incoming leg. Anything we
 * can't label confidently returns null (the UI falls back to Sent/Received).
 */
const LABELS: Record<string, { out?: string; in?: string }> = {
  approveAndRelease: { in: "Task payout" },
  selectWinners: { in: "Community payout" },
  cancelTask: { in: "Task refund" },
  createTask: { out: "Task escrow" },
  createCommunityTask: { out: "Task escrow" },
  transfer: { out: "Transfer", in: "Transfer" },
};
export function describeMethod(method: string | null | undefined, direction: "in" | "out"): string | null {
  if (!method) return null;
  return LABELS[method]?.[direction] ?? null;
}
