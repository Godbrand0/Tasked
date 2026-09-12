# Gas sponsorship (onboarding drip)

Mezo's gas token is **BTC**. A brand-new wallet can't call `registerUser` — or
apply for a bounty, or submit work — until it holds some BTC, which is a wall for
exactly the people Taskify wants: contributors who are here to *earn* MUSD and
haven't touched Mezo before.

This feature covers that first cliff, **invisibly**. When someone registers with
a fresh, empty wallet, Taskify sends it a small one-time BTC top-up from a
dedicated sponsor wallet before the `registerUser` transaction — enough for the
first ~5 transactions. The user never sees a "gas" step; registration just
works. After that they fund gas themselves (swap a bit of their first payout, or
bring BTC from elsewhere).

Scope, deliberately narrow:

- **Only** first-time contributor onboarding: `registerUser`, then the first few
  things they do (`applyForTask` / `joinCommunityTask` / `submitTask` / `setXVerified`).
- **One drip per Google identity, ever. One drip per wallet address, ever.**
- Creators and patrons pay their own gas — those actions move real money and are
  economically self-limiting.
- Not "gasless forever" — no relayer, no paymaster, no contract change.

## Farm resistance

Not cryptographic — economic. Every drip needs a fresh Google `sub`, proven by a
short-lived token the OAuth callback mints. Throwaway Google accounts cost a
farmer more (~$0.10–0.50 each) than the drip is worth (~a cent or two of BTC at
~5 L2 transactions), so farming is net-negative. `GAS_DRIP_DAILY_CAP` bounds the
worst case regardless. There is **no wallet-control signature** — it never
stopped farming (a farmer owns all their fake wallets) and only added a visible
prompt; the fresh-wallet checks + per-`sub` dedupe do the real work.

## How it works

```
/register
  ├── user signs in with Google (free — web OAuth)
  │     callback mints a short-lived HMAC token proving the Google `sub`
  │     and passes it back in the redirect (only when GAS_DRIP_SECRET is set)
  ├── user connects their (empty) wallet, picks a role
  └── clicks "Register on Mezo →"
        client (handleRegister): balance is 0 and a gasGrant is in hand
                -> POST /api/gas-drip { address, gasGrant }   (silent, no prompt)
        server: verify the Google token  -> sub
                no gas_drips row for this sub or this address
                daily cap not hit
                wallet is brand-new: nonce 0, balance 0, users(addr).role == 0
                reserve a gas_drips row (unique constraints = the race guard)
                sponsor wallet has enough BTC left (else 503 + log)
                send GAS_DRIP_AMOUNT_WEI BTC -> address, wait for receipt
                write tx_hash onto the reserved row
        client: poll balance until it lands, then call registerUser
        -> one MetaMask prompt (the register tx), paid from the top-up
```

Only visible on failure (cap hit / sponsor dry): one line pointing to the FAQ's
"how to get BTC on Mezo", instead of a doomed transaction.

Files: `frontend/app/api/gas-drip/route.ts`, `frontend/lib/gas-grant.ts`,
`frontend/app/api/auth/google/callback/route.ts` (mints the token),
`frontend/app/register/page.tsx` (`ensureGas` inside `handleRegister`),
`frontend/lib/wallet-context.tsx` (`nativeBalance` / `refetchNativeBalance`),
`supabase/migrations/0017_gas_drips.sql`.

## Setup

### 1. Sponsor wallet

Create a **new, dedicated** wallet — not the treasury, not the deployer. It only
ever sends small BTC transfers. Fund it with BTC on Mezo (start with ~0.001 BTC
and watch the burn rate). Keep the balance small; top it up on a schedule. A
leaked key can drain at most what's in it.

### 2. Database

Run `supabase/migrations/0017_gas_drips.sql` in the Supabase SQL editor.

### 3. Environment variables (Vercel + `frontend/.env.local`)

| Var | What | Example |
|---|---|---|
| `GAS_DRIP_PRIVATE_KEY` | sponsor wallet private key (`0x…`) | — |
| `GAS_DRIP_SECRET` | random string; signs the Google-identity token and hashes IPs | `openssl rand -hex 32` |
| `GAS_DRIP_AMOUNT_WEI` | drip size, in wei (BTC has 18 decimals) — ~5 transactions' worth, see calibration | `1125000000000` (0.0000011 BTC, ~$0.09 at $78k/BTC) |
| `GAS_DRIP_DAILY_CAP` | max drips per rolling 24h. **`0` disables the whole feature.** | `50` |
| `GAS_DRIP_MIN_SIGNER_BALANCE_WEI` | keep this much in the sponsor wallet as a reserve; below `amount + this`, the endpoint 503s | `0` |

The feature is **completely dormant** until `GAS_DRIP_PRIVATE_KEY`,
`GAS_DRIP_AMOUNT_WEI` (> 0), and `GAS_DRIP_DAILY_CAP` (> 0) are all set (and
Supabase + `NEXT_PUBLIC_TASKIFY_CONTRACT` are configured, which they already are).
Without them: the callback skips the token, `/register` shows a plain "you'll
need BTC" note with a link, and `/api/gas-drip` returns 503.

### 4. Calibrate `GAS_DRIP_AMOUNT_WEI`

Target: **~5 transactions' worth of BTC gas** — enough for `registerUser` plus a
first `applyForTask` / `joinCommunityTask` / `submitTask` / `setXVerified`, which
gets a contributor to their first payout (after which they have MUSD to swap for
more gas).

On Mezo mainnet, measure the gas used by those calls, take the current gas price,
multiply out for 5 txs, add ~30% headroom. It should still be small — Mezo is an
L2. Keep it **well under the cost of a throwaway Google account** so farming
stays unprofitable. Re-check if Mezo gas prices move.

## Operating it

- **Kill switch:** set `GAS_DRIP_DAILY_CAP=0` and redeploy (or just change the env
  var in Vercel and redeploy). Instant, total.
- **Refill:** send BTC to the sponsor wallet from the treasury wallet. The
  endpoint 503s and logs `sponsor wallet float low` when it can't cover the next
  drip + reserve.
- **Monitor:** `select count(*), sum(amount::numeric) from gas_drips where created_at > now() - interval '24 hours';`
  and check the sponsor wallet balance on the explorer. Conversion:
  `gas_drips` joined against `users_onchain` once the indexer runs.
- **Abuse ceiling:** worst case is `GAS_DRIP_AMOUNT_WEI × GAS_DRIP_DAILY_CAP` per
  day, if someone farms Google accounts + fresh wallets. Size the amount and cap
  so that number is an acceptable daily marketing spend. Rows carry an
  `ip_hash` (HMAC of the client IP) for loose after-the-fact rate analysis.

## Testnet first

Point the frontend at Mezo testnet (`NEXT_PUBLIC_MEZO_CHAIN_ID=31611`, testnet
RPC, testnet Taskify proxy `0x3e72A1E45CD5c499f1fd48C8f102Bf6C28381F69`), fund a
test sponsor wallet from `faucet.test.mezo.org`, and walk the flow with a fresh
wallet + fresh Google account before enabling on mainnet.

## Phase 2 — if the scope changes

If sponsorship needs to cover **all** contributor actions ongoing (not just the
onboarding cliff), or drip abuse consistently pins the daily cap despite the
per-identity limit, the next step is **EIP-2771 meta-transactions**: a V2
`upgradeToAndCall` that routes the contributor-side functions through a trusted
forwarder so a Taskify relayer pays gas and the user never needs BTC. That
touches all 61 `msg.sender` sites in `Taskify.sol` and re-opens the audit's
custody guarantee (`TASKIFY_SECURITY_AUDIT.md:19-34`), so it should precede a
professional audit, not follow it. Not in scope now.
