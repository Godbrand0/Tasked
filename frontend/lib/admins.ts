// Wallets that can use /admin. Not a secret: the server checks every admin
// request against this list after verifying the caller owns the wallet.
// Override with NEXT_PUBLIC_ADMIN_WALLETS (comma-separated).
export const ADMIN_WALLETS: ReadonlySet<string> = new Set(
  (process.env.NEXT_PUBLIC_ADMIN_WALLETS || "0x91487d8BC1B573f0BC6c23dE7BA23d50F49F627B")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => /^0x[0-9a-f]{40}$/.test(a)),
);

export function isAdmin(address: string | null | undefined): boolean {
  return !!address && ADMIN_WALLETS.has(address.toLowerCase());
}
