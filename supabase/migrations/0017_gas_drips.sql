-- One-time gas sponsorship for first-time contributors. Mezo's gas token is
-- BTC, so a brand-new wallet can't call registerUser without first acquiring
-- BTC — a chicken-and-egg wall for someone who's here to *earn* MUSD. The
-- /api/gas-drip route sends a small fixed amount of BTC to an eligible new
-- wallet and records it here. One drip per Google identity, one per address,
-- enforced by the unique constraints below (the race guard — not just the
-- pre-checks in the route).
--
-- See GAS_DRIP.md for the full design, eligibility rules, and kill switch.

create table gas_drips (
  id          uuid primary key default gen_random_uuid(),
  google_sub  text not null unique,   -- Google's stable per-user id (not email)
  address     text not null unique check (address = lower(address)),
  tx_hash     text,                   -- null while the row is a pre-send reservation; set once the BTC transfer confirms
  amount      text not null,          -- wei, as text — see 0001_numeric_to_text.sql
  ip_hash     text,                   -- hmac(ip, secret), for loose per-IP rate limiting
  created_at  timestamptz not null default now()
);
create index gas_drips_created_at_idx on gas_drips(created_at);

alter table gas_drips enable row level security;
-- No client policies: only the service-role API route ever reads or writes
-- this table (same pattern as the on-chain cache tables).
