// Turns the `?<provider>_error=<reason>` code the OAuth callbacks redirect
// with into something a user (or we, from a bug report) can act on. The
// reasons map to the fail() calls in app/api/auth/*/callback.

export function oauthErrorMessage(provider: "X" | "GitHub" | "Google", reason: string | null): string {
  switch (reason) {
    case "not_configured":
      return `${provider} sign-in isn't set up on the server yet.`;
    case "no_code":
      return `${provider} didn't return an authorization. If you cancelled, just retry — otherwise the ${provider} app's callback URL probably doesn't match this site.`;
    case "state_mismatch":
      return `${provider} security check failed. Retry; if it keeps happening, clear this site's cookies and try again.`;
    case "token_exchange":
      return `${provider} rejected the sign-in — the ${provider} app's client secret or callback URL is likely wrong.`;
    case "profile_fetch":
      return `Connected to ${provider}, but couldn't read your profile. Please try again.`;
    default:
      return `${provider} connection failed. Please try again.`;
  }
}
