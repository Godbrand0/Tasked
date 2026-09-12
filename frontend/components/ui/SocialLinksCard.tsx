const X_URL = "https://x.com/taskifyhq";
const TELEGRAM_URL = "https://t.me/+W1fXHQWioTA2ZDlk";

/** Sidebar card linking out to Taskify's X and Telegram — same URLs as the landing footer. */
export default function SocialLinksCard() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Stay in the loop</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn-motion"
          style={{ background: "var(--neutral-tint)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Follow @taskifyhq on X
        </a>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-motion"
          style={{ background: "var(--neutral-tint)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21.944 4.667a1.44 1.44 0 0 0-1.47-.245L3.36 11.06c-.9.354-.885 1.64.02 1.973l4.263 1.567 1.65 5.303c.196.63 1 .81 1.446.325l2.377-2.586 4.28 3.155c.53.39 1.29.1 1.43-.55l3.06-14.2a1.44 1.44 0 0 0-.522-1.373zM9.9 14.38l7.06-4.45c.13-.082.26.096.15.2l-5.83 5.42a.9.9 0 0 0-.28.53l-.2 1.98c-.02.16-.24.18-.29.03z"/></svg>
          Join the Telegram
        </a>
      </div>
    </div>
  );
}
