// Canonical form of an email for "is this the same person's mailbox" checks.
// Lowercased everywhere; for Gmail/Googlemail the dots in the local part and
// any "+tag" suffix are ignored too, since a.b+x@gmail.com and ab@gmail.com
// are the same inbox. Other providers only get lowercasing: dots and plus-tags
// aren't guaranteed to be insignificant there.
//
// MUST stay in sync with normalize_email() in
// supabase/migrations/0018_google_email_unique.sql — the database enforces
// uniqueness on that function's output, this one is used for lookups.
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    domain = "gmail.com";
    local = local.split("+")[0].replace(/\./g, "");
  }
  return `${local}@${domain}`;
}
