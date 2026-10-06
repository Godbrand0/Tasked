// Throws if this Google email is already linked to a different wallet.
// Called BEFORE anything irreversible or costly on registration — the gas
// top-up and the on-chain registerUser — see /api/identity/google-available.
// Fails open on network/server errors; the unique index on
// profiles.google_email_normalized still rejects a duplicate profile.
export async function assertGoogleAvailable(email: string, address: string): Promise<void> {
  if (!email) return;
  const res = await fetch("/api/identity/google-available", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, address }),
  });
  if (res.ok && !(await res.json()).available) {
    throw new Error("This Google account is already linked to another Taskify wallet. Connect that wallet instead.");
  }
}
