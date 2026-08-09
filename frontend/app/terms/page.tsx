import Link from "next/link";

const EFFECTIVE_DATE = "August 8, 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "Taskify is a set of smart contracts deployed on the Mezo network and an interface for interacting with them. By connecting a wallet and using the interface at this domain, you agree to these Terms & Conditions. If you do not agree, do not use Taskify.",
    ],
  },
  {
    title: "2. Nature of the Protocol",
    body: [
      "Taskify is non-custodial. No one — including the team that built it — holds, controls, or can unilaterally move funds you lock in the contract. Escrow, experience gating, fee splits, grant voting, and wave rewards are all enforced entirely by the deployed smart contract code.",
      "Because the protocol is decentralized, transactions you submit are irreversible once confirmed on-chain. There is no support desk that can reverse a transfer, refund a mistaken deposit, or undo an approved release of funds.",
    ],
  },
  {
    title: "3. No Financial or Legal Advice",
    body: [
      "Nothing on this site — including task descriptions, grant justifications, fee breakdowns, or FAQ content — constitutes financial, investment, legal, or tax advice. Depositing MUSD into the grant pool, staking MEZO, or posting a self-funded task are decisions you make at your own risk and discretion.",
    ],
  },
  {
    title: "4. Eligibility",
    body: [
      "You must be legally able to enter into these terms in your jurisdiction and must comply with all laws applicable to you, including any restrictions on interacting with decentralized protocols, stablecoins, or governance tokens. You are solely responsible for determining whether use of Taskify is lawful where you are located.",
    ],
  },
  {
    title: "5. Wallets and Account Security",
    body: [
      "You are solely responsible for the security of your wallet, private keys, and seed phrase. Taskify never asks for your seed phrase and has no mechanism to recover a lost wallet or reverse a transaction signed from a compromised key.",
    ],
  },
  {
    title: "6. GitHub Verification",
    body: [
      "GitHub OAuth is used only to attach a verified GitHub handle to your on-chain profile. Taskify requests the minimum GitHub scopes required for identity verification and does not post, modify, or delete anything in your GitHub account.",
    ],
  },
  {
    title: "7. Smart Contract and Market Risk",
    body: [
      "Smart contracts can contain bugs, and audits — even completed ones — do not eliminate risk. By using Taskify you accept the risk of loss due to contract vulnerabilities, oracle or bridge failures affecting MUSD or MEZO, network congestion or outages on Mezo, and general volatility or de-pegging risk in any token you hold or deposit.",
    ],
  },
  {
    title: "8. Task Escrow, Grants, and Disputes",
    body: [
      "Task approval is a decision made solely by the task creator; Taskify does not arbitrate whether submitted work meets a creator's expectations. Grant approval is decided by weighted community vote per the on-chain formula, not by the Taskify team. Neither the interface operator nor any Taskify contributor is a party to, or guarantor of, any task agreement between a creator and a contributor.",
    ],
  },
  {
    title: "9. No Warranty",
    body: [
      "Taskify is provided \"as is\" and \"as available,\" without warranties of any kind, express or implied, including fitness for a particular purpose, non-infringement, or uninterrupted availability.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, in no event will the Taskify team, contributors, or the interface operator be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of funds, profits, or data arising from your use of the protocol or interface.",
    ],
  },
  {
    title: "11. Changes to These Terms",
    body: [
      "These terms may be updated as the protocol evolves. Material changes will be reflected by updating the effective date at the top of this page. Continued use of Taskify after a change constitutes acceptance of the revised terms.",
    ],
  },
  {
    title: "12. Contact",
    body: [
      "Questions about these terms can be raised through the project's GitHub repository.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 96px" }}>
        <Link href="/" style={{ color: "#7070A0", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to Taskify
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: "#F0F0F5", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Terms &amp; Conditions
        </h1>
        <p style={{ fontSize: 13, color: "#7070A0", margin: "0 0 40px" }}>Effective {EFFECTIVE_DATE}</p>

        <div style={{ background: "#111116", border: "1px solid #F7931A28", borderRadius: 14, padding: "18px 22px", marginBottom: 40, fontSize: 13, color: "#9090B0", lineHeight: 1.7 }}>
          Taskify is a non-custodial, decentralized protocol. Nothing here is financial or legal advice, and no one can reverse a confirmed on-chain transaction on your behalf. Read this in full before connecting a wallet.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#F0F0F5", margin: "0 0 10px" }}>{section.title}</h2>
              {section.body.map((p, i) => (
                <p key={i} style={{ fontSize: 14, color: "#9090B0", lineHeight: 1.8, margin: i === 0 ? "0 0 10px" : "10px 0 0" }}>
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #1E1E2A", marginTop: 48, paddingTop: 24 }}>
          <Link href="/#faq" style={{ color: "#F7931A", fontSize: 13, textDecoration: "none" }}>Have questions? See the FAQ →</Link>
        </div>
      </div>
    </div>
  );
}
