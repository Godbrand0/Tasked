Taskify: Mezo Grant Submission

Date: September 2026
Status: Live on Mezo mainnet since 8 September 2026


Overview

Taskify is a bounty board built for Mezo. Projects and community members post paid tasks, the reward is locked in escrow in MUSD or MEZO, and contributors are paid as soon as their work is approved.

Taskify helps Mezo grow in four ways:

• More MUSD holders. Every task pays contributors in MUSD or MEZO.
• More people learning about Mezo. Paid tasks ask contributors to explain Mezo features and share them on their own X accounts, so Mezo reaches new audiences.
• Easier onboarding. We sponsor gas, so new users from Web2 or other chains can start on Mezo without first finding BTC.
• More activity on Mezo. Every registration, application and payout is a Mezo transaction.


1. Links

• Website: https://taskifybounties.com
• GitHub: https://github.com/Godbrand0/Tasked
• X (verified): https://x.com/taskifyhq
• Contract (Mezo mainnet): https://explorer.mezo.org/address/0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D


2. Current metrics

Nine days after mainnet launch:

• Tasks posted: 7 (5 community, 2 development)
• Tasks completed and paid: 3
• Paid to contributors: 362 MEZO and 1.16 MUSD
• Registered users: [fill in]
• New wallets onboarded with sponsored gas: [fill in]
• Failed payouts or lost funds: 0

Beyond the contract:

• Three Mezo projects, aurove, Matchbox and vezo Exchange, are open to posting tasks on Taskify.
• Users from the Mezo Discord have signed up after our posts there.
• Our verified X account posts live tasks regularly.


3. Targets for the next 6 months

These targets are deliberately conservative. We would rather beat them than miss them.

• Registered users: [fill in] today, 150 by December 2026, 400 by March 2027
• Tasks posted (total): 7 today, 40 by December, 100 by March
• Paid to contributors (total): 362 MEZO and 1.16 MUSD today, $1,000 by December, $3,000 by March
• Mezo projects posting tasks: 3 in talks today, 2 live by December, 5 by March
• New wallets onboarded with sponsored gas: [fill in] today, 100 by December, 300 by March
• Paid posts explaining Mezo: [fill in] today, 20 by December, 50 by March
• Grants approved by veBTC holders: 2 by March
• Security incidents: 0 throughout


4. Product roadmap for the next 6 months

October to November 2026: security and trust
• Complete the Mezo security review.
• Add a delay (timelock) on contract upgrades, so users get a window to exit before any upgrade takes effect. This is the one remaining gap in our governance setup.
• Small usability improvements, such as share links for tasks.

November to December 2026: ecosystem tools
• Make it easy for Mezo projects to post tasks on their own.
• Turn on grant voting for veBTC holders.

January to February 2027: cashing out small amounts
• Build a way for contributors to move as little as $1 of MUSD to USDC on Ethereum. Today, small earnings fall below the minimum withdrawal. We have discussed this with Zho from the Mezo team.
• Launch a small pilot after a security review.

March 2027: contributor growth
• Contributor profiles showing completed work and earnings.
• Notifications for every task update.
• A public page with live Taskify stats.


5. Security report

• Reviews completed: three rounds — an internal manual review and an external automated scan in August 2026, and a further internal review in September 2026 that deliberately targeted what the first two predated: the contract becoming upgradeable, and going live on mainnet with real funds. The September round raised one High, two Medium and one Low finding. All four are now resolved.
• All findings fixed on mainnet. The most important fix moved control of the contract from a single wallet to a multisig (Safe) at safe.mezo.org. All fixes went live within a day of the September review.
• Governance is now live and public. The contract and the treasury are both owned by a 2-of-3 Safe at 0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31. Two of the three signers must approve before any administrative change or contract upgrade takes effect. One of the three is a member of the Mezo g6 community, independent of our team, so we cannot make changes entirely among ourselves without an outside signer seeing them. Anyone can verify this by reading CONTRACT_OWNER() on the contract and getOwners()/getThreshold() on the Safe.
• No owner function can touch funds locked in escrow. The multisig can upgrade the contract, change the fee treasury address, set the voting-weight sources and approve pilot voters; it cannot withdraw a user's escrowed funds, spend the grant pool outside an approved grant, or change a vote.
• Remaining gap, stated plainly: there is no timelock on upgrades yet, so an approved upgrade takes effect immediately. That is the next item on our roadmap. We have documented this limitation publicly on the site (in the docs, FAQ and Terms) rather than leaving users to discover it.
• Testing: 45 automated tests, including a stateful invariant suite that runs thousands of random action sequences to check that funds always balance and can never be paid twice. Adding this suite closes the one standing recommendation the September review left open on testing.
• Full reports: available on GitHub.

• What the September review found, in plain terms: the most serious problem was not in the contract code at all. The code correctly restricted upgrades to the owner; the problem was that the owner was a single key. That became a High severity issue the moment real money was in the contract, and we closed it by moving ownership to the multisig. The other three findings were latent rather than active: none could be exploited by an outsider, and each would only have caused harm during a future upgrade or ownership change. We fixed all three before that could happen.
• The review also tested two suspected problems and found them not to be real — wave reward over-payment and mixing of escrow funds with the reward pool. We mention this because knowing what was checked and held is as much part of the result as the findings.

Taskify has not yet had a third-party audit. All three of our reviews so far were internal or automated, and we are clear on the site that this is necessary but not sufficient. We are requesting a security review from the Mezo team, and we plan a paid third-party audit before larger amounts are held in the contract.


6. Three-month marketing and launch plan

Already started:
• Outreach to Mezo projects.
• Posts in the Mezo Discord.
• Outreach to developer communities.
• An active X account run by our social media manager.

Month 1 (October): learn Mezo, get paid
• Paid tasks where contributors explain Mezo topics (Borrow, veBTC, MUSD, bridging) and post them on X.
• Publish a simple getting-started guide.
• Keep gas sponsorship running so new users can start right away.

Month 2 (November): ecosystem projects
• Help aurove, Matchbox and vezo Exchange post their first tasks.
• Offer Taskify as a bounty platform for Mezo hackathons and developer programs.

Month 3 (December): growth and retention
• Joint campaigns with the Mezo ecosystem marketing program, once approved.
• Monthly spotlights on top contributors.
• Share a monthly metrics report with the Mezo team.


7. Team

• [Name]: Founder and lead developer. [Background in one or two lines.]
• [Name]: Social media manager, employed for Taskify.
• [Name]: Community moderator, employed for Taskify.
• Developer network: a group of developers we can bring in for development tasks and hackathons.


What would help us most

• A security review from the Mezo team. It lets users and projects trust Taskify with larger bounties.
• Grant funding for bounty rewards paid to Mezo community members, gas sponsorship, liquidity for the small-amount cash-out feature, and a third-party audit.
• Introductions to Mezo projects and veBTC holders.
• Inclusion in Mezo ecosystem marketing.


Our commitment to Mezo

Taskify is built for Mezo only, and we are here for the long term. We are already paying for gas sponsorship and our community team ourselves, without waiting for a grant. As more products launch on Mezo, each one is another team that can post work on Taskify, so Taskify grows as Mezo grows.
