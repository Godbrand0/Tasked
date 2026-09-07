# Taskify Mainnet — Initial Task Batch (drafts)

Seed set for launch day. **Amounts are left blank** — fill `Amount` before posting.
Post each through `/create` as the Owner wallet; the description block is markdown
and goes to `task_content.description` (Supabase) after the on-chain tx.

Mix: 4 Development, 4 Community. Keep the first batch small and tightly scoped so
early contributors can finish and get paid fast (good for the launch narrative).

Suggested deadlines assume a launch date of **2026-09-XX** — adjust on the day.

---

## Development tasks

### D1 — Copy-to-clipboard on wallet addresses
| Field | Value |
|---|---|
| Kind | Development |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Experience | Newcomer → Junior |
| Deadline | launch + 7 days |
| Topic | Frontend / UI |
| Tags | React, TypeScript, UX |
| Amount | _TBD_ |

**Description**

Every place the app renders a raw `0x…` wallet address (profile headers, task
creator/assignee, patron leaderboard, vote page) should have a small click-to-copy
affordance with a "Copied" confirmation.

Acceptance criteria:
- Reusable `<Address />` (or hook) — no per-call-site duplication
- Copies the full checksummed address, not the truncated display string
- Visible affordance on hover (desktop) and always-visible tap target (mobile)
- Works in both light and dark themes
- No new dependencies

Deliverable: PR against `frontend/`, screenshots of before/after in both themes.

---

### D2 — Live countdown on task deadlines and grant votes
| Field | Value |
|---|---|
| Kind | Development |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Experience | Junior → Mid-level |
| Deadline | launch + 10 days |
| Topic | Frontend / UI |
| Tags | React, TypeScript, viem |
| Amount | _TBD_ |

**Description**

On the task detail page (`app/tasks/[id]`) and the vote page (`app/vote`), replace
the static deadline date with a live-updating countdown ("2d 14h left", "closed").

Acceptance criteria:
- Reads the on-chain `deadline` / grant `deadline`, not an off-chain copy
- Updates without a page refresh (interval is fine — no new libs)
- Distinct states: counting down, <24h (amber), passed ("Expired — anyone can call markExpired" / "Voting closed")
- Handles grant tasks correctly: voting deadline while `GrantPending`, then work deadline once `Open`
- SSR-safe (no hydration mismatch)

Deliverable: PR, short screen recording of the countdown ticking.

---

### D3 — Foundry invariant tests for pool/custody accounting
| Field | Value |
|---|---|
| Kind | Development |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Experience | Senior → Expert |
| Deadline | launch + 21 days |
| Topic | Security / Audit |
| Tags | Solidity, Foundry, Invariant-Testing |
| Amount | _TBD_ |

**Description**

The security review (`TASKIFY_SECURITY_AUDIT.md`) notes no fuzzing or
invariant/property testing was done. Add a Foundry invariant suite for
`contracts/src/Taskify.sol`.

Invariants to cover at minimum:
- `grantPoolBalance` ≤ actual MUSD balance held by the contract attributable to the pool
- `wavePoolAmount` + sum of unclaimed wave-snapshot pool amounts ≤ contract MUSD not otherwise earmarked
- Sum of all live task `amount`s (non-terminal statuses) ≤ contract token balance per token
- A task never leaves a terminal status
- `waveTotalTasks` == Σ `waveCreatorTasks[currentWaveId][*]` while the wave is live

Acceptance criteria:
- New `contracts/test/Invariants.t.sol`, handler-based, bounded actors
- Runs in CI (`forge test`) in reasonable time; document the run/depth config
- All existing 26 tests still pass

Deliverable: PR with the suite + a short note on anything the invariants surfaced.

---

### D4 — Slither static-analysis CI workflow
| Field | Value |
|---|---|
| Kind | Development |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Experience | Mid-level → Senior |
| Deadline | launch + 14 days |
| Topic | Infrastructure / Tooling |
| Tags | Solidity, CI, Slither, GitHub-Actions |
| Amount | _TBD_ |

**Description**

The audit doc notes no static-analysis tooling has been run. Add a GitHub Actions
workflow that runs Slither on `contracts/` on every PR touching `contracts/**`.

Acceptance criteria:
- Workflow file under `contracts/.github/workflows/` (or repo root `.github/`)
- Uses `crytic/slither-action`, pinned
- Triage-config committed so known/accepted findings (see `TASKIFY_SECURITY_AUDIT.md`) don't fail the build, but new findings do
- A short `contracts/SLITHER.md` explaining how to run it locally and how the triage list is maintained
- PR includes the output of the first clean run

Deliverable: PR + link to a green workflow run on the PR.

---

## Community tasks

### C1 — Mainnet launch meme contest
| Field | Value |
|---|---|
| Kind | Community |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Winners | 5 |
| Deadline | launch + 7 days |
| Topic | Other |
| Tags | Meme, Social, Launch |
| Amount | _TBD_ (splits evenly across 5) |

**Description**

Taskify is live on Mezo mainnet. Flood the timeline with good memes about it.

How it works:
- Post an original meme about Taskify / building on Mezo on X
- Join this task with a link to your post
- Top 5 (picked on originality and on-topic-ness, not raw engagement) split the pot evenly

Rules: original work only, must tag @taskifyhq, must be public. No engagement farming, no reposts.

---

### C2 — Reproducible bug reports from real mainnet use
| Field | Value |
|---|---|
| Kind | Community |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Winners | 3 |
| Deadline | launch + 14 days |
| Topic | Testing / QA |
| Tags | QA, Bug-Report, Testing |
| Amount | _TBD_ |

**Description**

We want clear, reproducible bug reports from real mainnet usage — write-ups, not
code fixes.

What counts:
- Exact steps to reproduce
- Expected vs actual behaviour
- Wallet / browser / network context
- Screenshots or a short screen recording

Join with a link to a public write-up (GitHub issue, Notion doc, thread — anything
readable). The 3 most useful, clearly-written reports get paid. Duplicates: first
clear report of an issue wins it.

---

### C3 — "Post your first bounty" walkthrough
| Field | Value |
|---|---|
| Kind | Community |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Winners | 3 |
| Deadline | launch + 14 days |
| Topic | Documentation |
| Tags | Content, Tutorial, Docs |
| Amount | _TBD_ |

**Description**

Write a beginner walkthrough of using Taskify end to end: connect wallet → register
→ post a self-funded task (escrow lock) → assign a contributor → approve and release.

Acceptance criteria:
- Public, readable (blog post, GitHub gist, Mirror, thread — your call)
- Real screenshots from mainnet
- Covers the wallet-safety basics (exact-amount approvals, self-custody) — see the FAQ
- Accurate on fees (3% self / 5% grant, 60/40 treasury/wave split)

Top 3 get paid. Bonus consideration for a version in a non-English language.

---

### C4 — Explainer thread: grant voting + veBTC
| Field | Value |
|---|---|
| Kind | Community |
| Funding | Self-funded (3%) |
| Currency | MUSD |
| Winners | 3 |
| Deadline | launch + 10 days |
| Topic | Other |
| Tags | Content, Governance, veBTC |
| Amount | _TBD_ |

**Description**

Write an X thread (or short article) explaining how Taskify grant funding works:
the patron pool, how voting weight comes from a live veBTC position on Mezo Earn
(not from MUSD deposits), the per-proposal snapshot, and the current invite-only
pilot voter phase.

Acceptance criteria:
- Accurate to how the contract actually works (see `VOTING_SYSTEM_REDESIGN.md` and the FAQ)
- Tag @taskifyhq, public
- Clear enough for someone new to Mezo governance

Top 3 by clarity and accuracy split the pot.

---

## Posting checklist (per task)

1. `/create` as Owner wallet → fill fields above → set Amount
2. Approve exact amount when prompted (MUSD/MEZO) → confirm `createTask` / `createCommunityTask`
3. Confirm the task appears on the bounty board and the description saved (Supabase)
4. For Community tasks: nothing else until you `selectWinners`
5. Announce the batch from @taskifyhq
