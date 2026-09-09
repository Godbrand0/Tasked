import Link from "next/link";

const EFFECTIVE_DATE = "September 9, 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Scope",
    body: [
      "This Privacy Policy explains what information is collected when you use the Taskify interface hosted at this domain, how it is used, and the choices you have. It covers the website and its supporting services (database, notifications, identity verification). It does not cover the Mezo network, your wallet software, or any third-party site you reach through a link.",
      "Taskify is a non-custodial protocol. The smart contracts do not collect personal information — they record wallet addresses and transaction data on a public blockchain. The interface operator described here runs only the website and the off-chain services that support it.",
    ],
  },
  {
    title: "2. Information You Provide",
    body: [
      "Identity verification (required to register): registration uses Google OAuth, from which Taskify receives your email address, name, and profile picture URL. You may additionally link a GitHub or X (Twitter) account, from which Taskify receives your handle, display name, and avatar URL. Taskify requests only read-level scopes and never posts, modifies, or deletes anything in those accounts.",
      "Profile details: an optional display name, bio, and a profile picture you upload (stored as an image on your profile record).",
      "Notification email (optional, opt-in): if you add an email address in settings, it is used only to mirror in-app notifications by email. Leave it blank and no email is ever sent to you.",
      "Content you submit: task titles and descriptions, tags, repository links, grant justifications, images attached to tasks, the motivation text you write when applying to a task, pull-request and issue links you submit as work, and comments you post on task threads. This content is stored off-chain and is visible to other users of the app.",
      "Notification preferences: the per-category toggles you set for which events notify you.",
    ],
  },
  {
    title: "3. Information Collected Automatically",
    body: [
      "Hosting logs: the site is hosted on Vercel, which processes standard request data (IP address, user agent, requested URL, timestamp) to serve the site and protect it from abuse.",
      "Analytics: Taskify uses Vercel Analytics, which records aggregate page-view and performance data without cookies and without building a cross-site profile of you.",
      "Taskify does not use advertising trackers, third-party marketing pixels, or session-recording tools.",
    ],
  },
  {
    title: "4. On-Chain Information Is Public and Permanent",
    body: [
      "When you register, post or fund a task, apply, submit work, deposit into the grant pool, stake, vote, or claim a wave reward, that action is a transaction on the Mezo network. Your wallet address, the on-chain username you chose, your role and experience level, task and payout history, deposit and stake amounts, votes, and transaction hashes are recorded on a public blockchain.",
      "The Taskify interface runs an indexer that copies this on-chain data into a database so the app can display it quickly. That cached copy is derived entirely from the public chain.",
      "On-chain data cannot be edited or deleted by anyone, including the Taskify team. Do not put anything on-chain that you are not comfortable being public and permanent.",
    ],
  },
  {
    title: "5. How Information Is Used",
    body: [
      "To operate core features: create and display profiles, match contributors to tasks by experience, show task content and comments, run the grant-voting and wave-reward flows, and attach verified GitHub or X handles to a profile.",
      "To send notifications: in-app alerts for events relevant to you and, only if you opted in with an email address, the same alerts by email.",
      "To keep the service working and secure: debugging, preventing abuse and spam, and enforcing the Terms & Conditions.",
      "Taskify does not sell your personal information and does not use it for advertising or automated decision-making that produces legal effects.",
    ],
  },
  {
    title: "6. Service Providers",
    body: [
      "Taskify shares information with a small set of processors that act on its instructions: Vercel (website hosting and privacy-friendly analytics); Supabase (the database and image storage for off-chain profiles, task content, comments, and notifications); Google, GitHub, and X (identity verification via OAuth — the data flow to them is governed by their own policies and by the permission screen you approve); and an email delivery provider used to send transactional notification emails only if you supplied an email address.",
      "Information may also be disclosed if required by law, or to protect the rights, safety, or property of Taskify, its users, or the public.",
    ],
  },
  {
    title: "7. Cookies and Local Storage",
    body: [
      "Taskify does not use tracking or advertising cookies. When you link an X account, a few short-lived, HTTP-only cookies are set to carry the OAuth security tokens through that single sign-in flow and are deleted immediately after.",
      "The app uses your browser's local storage to remember interface state such as your connected wallet and preferences. This stays in your browser and is not transmitted to Taskify as a tracking identifier.",
    ],
  },
  {
    title: "8. Retention and Deletion",
    body: [
      "Off-chain data (profile, uploaded avatar, notification email, notification history, and task content you authored) is kept while your profile exists. You can ask for your off-chain profile data and notification email to be deleted by contacting the project; task content, applications, and comments that are part of a shared task history may be retained or anonymized where removing them would break the record for other participants.",
      "On-chain data cannot be deleted. A deletion request only affects the off-chain copy and the indexed cache, both of which will be re-derived from the public chain as long as the underlying transactions exist.",
      "Hosting logs and aggregate analytics are retained on the providers' standard schedules.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "Off-chain data is protected with row-level security rules, encrypted transport (HTTPS), and access limited to the services that need it. No system is perfectly secure, and Taskify cannot guarantee that unauthorized access will never occur.",
      "Taskify never asks for your seed phrase or private key and has no ability to move funds from your wallet.",
    ],
  },
  {
    title: "10. International Users",
    body: [
      "Taskify's service providers process data in the United States and other countries. By using the interface you understand that your information may be processed in a jurisdiction with different data-protection rules than your own.",
    ],
  },
  {
    title: "11. Children",
    body: [
      "Taskify is not directed to, and may not be used by, anyone under 18. Taskify does not knowingly collect information from children. If you believe a minor has provided information, contact the project so it can be removed.",
    ],
  },
  {
    title: "12. Your Choices",
    body: [
      "You can link or unlink GitHub and X at any time, add or remove your notification email, adjust notification preferences per category, and edit or clear your display name, bio, and uploaded avatar in settings. Depending on where you live, you may have rights to access, correct, or delete personal data, or to object to certain processing — contact the project to exercise them, keeping in mind the on-chain limits described above.",
    ],
  },
  {
    title: "13. Changes to This Policy",
    body: [
      "This policy may be updated as the interface evolves. Material changes will be reflected by updating the effective date at the top of this page. Continued use of Taskify after a change constitutes acceptance of the revised policy.",
    ],
  },
  {
    title: "14. Contact",
    body: [
      "Privacy questions and access or deletion requests can be raised through the project's GitHub repository.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 96px" }}>
        <Link href="/" style={{ color: "var(--text-dim)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to Taskify
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "justify", margin: "0 0 40px" }}>Effective {EFFECTIVE_DATE}</p>

        <div style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", borderRadius: 14, padding: "18px 22px", marginBottom: 40, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Taskify is a non-custodial, decentralized protocol. Anything you put on-chain — your wallet address, username, and transaction history — is public and permanent and cannot be deleted. This policy covers the off-chain interface and the services behind it.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>{section.title}</h2>
              {section.body.map((p, i) => (
                <p key={i} style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, margin: i === 0 ? "0 0 10px" : "10px 0 0" }}>
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 48, paddingTop: 24 }}>
          <Link href="/terms" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Read the Terms &amp; Conditions →</Link>
        </div>
      </div>
    </div>
  );
}
