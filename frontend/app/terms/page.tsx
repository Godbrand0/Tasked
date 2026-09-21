import Link from "next/link";

const EFFECTIVE_DATE = "September 21, 2026";

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
      "Taskify is non-custodial. No one — including the team that built it — holds your funds or can withdraw, move or release funds you lock in escrow. Escrow, experience gating, fee splits, grant voting, and wave rewards are all enforced entirely by the deployed smart contract code, and no administrative function exists that can take funds out of an escrow.",
      "This is subject to one important qualification, set out in full in Section 13: the contract is upgradeable, and the parties who control upgrades could deploy new code that changes the rules described above. Read Section 13 before locking funds.",
      "Because the protocol is decentralized, transactions you submit are irreversible once confirmed on-chain. There is no support desk that can reverse a transfer, refund a mistaken deposit, or undo an approved release of funds.",
    ],
  },
  {
    title: "3. No Financial or Legal Advice",
    body: [
      "Nothing on this site (including task descriptions, grant justifications, fee breakdowns, or FAQ content) constitutes financial, investment, legal, or tax advice. Depositing MUSD into the grant pool, staking MEZO, or posting a self-funded task are decisions you make at your own risk and discretion.",
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
      "Smart contracts can contain bugs, and audits (even completed ones) do not eliminate risk. By using Taskify you accept the risk of loss due to contract vulnerabilities, oracle or bridge failures affecting MUSD or MEZO, network congestion or outages on Mezo, and general volatility or de-pegging risk in any token you hold or deposit.",
    ],
  },
  {
    title: "8. Task Escrow, Grants, and Disputes",
    body: [
      "Task approval is a decision made solely by the task owner; Taskify does not arbitrate whether submitted work meets an owner's expectations. Grant approval is decided by weighted community vote per the on-chain formula, not by the Taskify team. Neither the interface operator nor any Taskify contributor is a party to, or guarantor of, any task agreement between an owner and a contributor.",
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
    title: "11. Upgradeability and Administrative Control",
    body: [
      "The Taskify contract is deployed behind a UUPS upgradeable proxy. This means the code that governs escrow, fees, voting and wave rewards can be replaced with new code. You should understand this before locking funds: an upgrade can change any rule described in these terms or in the documentation, including rules that determine how and when escrowed funds are released.",
      "Authority to perform an upgrade, and to perform the other administrative actions listed below, is held by a 2-of-3 Safe multisig deployed on the Mezo network at 0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31 and operated through safe.mezo.org. At least two of the three signers must approve before any such action takes effect. One signer is a member of the Mezo g6 community who is independent of the Taskify team; the remaining two are Taskify core team members. Because the threshold is two, the two team signers are together capable of meeting it.",
      "The administrative actions available to the multisig are exhaustively: upgrading the contract implementation; changing the treasury address that receives the protocol's share of fees; setting the veBTC and veMEZO escrow contracts from which voting weight is read; adding or removing wallets from the grant-voting approval list; and transferring ownership to another address, which the receiving address must separately accept.",
      "The multisig cannot withdraw, move or release funds held in a task escrow; cannot disburse the grant pool other than through an executed, community-approved grant; cannot cast or alter votes; and cannot change the MUSD or MEZO token addresses, which are fixed at deployment. Advancing a wave is permissionless and does not require the multisig.",
      "There is currently no timelock on upgrades. An approved upgrade takes effect immediately, and you will not have a guaranteed period in which to withdraw beforehand. You accept this risk by using the protocol. The current owner of the contract can be verified at any time by reading CONTRACT_OWNER() on the Taskify contract and getOwners() and getThreshold() on the multisig address above.",
    ],
  },
  {
    title: "12. Governance Is Not a Guarantee",
    body: [
      "The multisig arrangement described in Section 11 reduces the risk that a single compromised or acting-alone key can change the protocol. It does not eliminate that risk, and it is not a representation that the protocol is fully decentralized, immutable, or beyond the control of its operators. Signers could act in concert, lose their keys, or be compelled to act. Nothing in these terms creates a duty owed to you by any individual signer, and no signer guarantees the continued operation, solvency or safety of the protocol.",
    ],
  },
  {
    title: "13. Changes to These Terms",
    body: [
      "These terms may be updated as the protocol evolves. Material changes will be reflected by updating the effective date at the top of this page. Continued use of Taskify after a change constitutes acceptance of the revised terms.",
    ],
  },
  {
    title: "14. Contact",
    body: [
      "Questions about these terms can be raised through the project's GitHub repository.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 96px" }}>
        <Link href="/" style={{ color: "var(--text-dim)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to Taskify
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Terms &amp; Conditions
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "justify", margin: "0 0 40px" }}>Effective {EFFECTIVE_DATE}</p>

        <div style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", borderRadius: 14, padding: "18px 22px", marginBottom: 40, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Taskify is a non-custodial protocol: no one can take funds out of your escrow. But the contract <strong>is</strong> upgradeable, and upgrade authority is held by a 2-of-3 multisig — see Section 11 below. Nothing here is financial or legal advice, and no one can reverse a confirmed on-chain transaction on your behalf. Read this in full before connecting a wallet.
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
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Link href="/docs#governance" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Governance &amp; the owner multisig →</Link>
            <Link href="/faq" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}>Have questions? See the FAQ →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
