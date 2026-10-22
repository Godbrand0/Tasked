// Pure decision rules for notifications, kept free of server-only imports so
// they can be unit-tested directly. lib/notifications.ts applies them.

// Types that are OFF unless the recipient switched them on (broadcasts to many
// people). Every other type predates this and stays ON unless switched off, so
// existing profiles with no stored key keep getting them.
export const OPT_IN_TYPES = ["new_dev_task", "new_community_task"] as const;

export function isOptInType(type: string): boolean {
  return (OPT_IN_TYPES as readonly string[]).includes(type);
}

/** Whether `prefs` allow a notification of this type to be created at all. */
export function prefAllows(prefs: Record<string, unknown> | null | undefined, type: string): boolean {
  const value = prefs?.[type];
  return isOptInType(type) ? value === true : value !== false;
}

/**
 * Whether an email may be sent. Opt-in broadcasts only go to a verified
 * address (an unverified one could be someone else's, typed into a profile);
 * the older per-event emails keep their existing behaviour.
 */
export function mayEmail(type: string, email: string | null | undefined, emailVerified: boolean | null | undefined): boolean {
  if (!email) return false;
  return isOptInType(type) ? emailVerified === true : true;
}
