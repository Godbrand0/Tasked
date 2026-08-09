-- Fixes a real bug found while building the indexer: PostgREST serializes
-- `numeric` columns as bare JSON numbers, and 18-decimal MUSD/MEZO amounts
-- routinely exceed Number.MAX_SAFE_INTEGER — any standard JSON.parse
-- (including inside supabase-js) silently corrupts them on read. `text`
-- round-trips exactly; parse with BigInt(value) in application code.
--
-- schema.sql has already been updated for future deployments — this
-- migration brings an already-provisioned database in line with it. Run
-- this once in the Supabase SQL editor (dashboard > SQL Editor), or via
-- `psql` if you have the direct connection string.
--
-- Safe to run even though these tables are currently empty in this
-- project — USING ...::text works either way.

alter table users_onchain       alter column total_earned   type text using total_earned::text;
alter table users_onchain       alter column total_earned   set default '0';

alter table tasks               alter column amount         type text using amount::text;

alter table patrons_onchain     alter column total_deposited type text using total_deposited::text;
alter table patrons_onchain     alter column total_deposited set default '0';
alter table patrons_onchain     alter column mezo_staked     type text using mezo_staked::text;
alter table patrons_onchain     alter column mezo_staked     set default '0';

alter table grant_votes_onchain alter column votes_for       type text using votes_for::text;
alter table grant_votes_onchain alter column votes_for       set default '0';
alter table grant_votes_onchain alter column votes_against   type text using votes_against::text;
alter table grant_votes_onchain alter column votes_against   set default '0';

alter table grant_voters_onchain alter column weight         type text using weight::text;

alter table wave_snapshots_onchain alter column pool_amount  type text using pool_amount::text;

alter table wave_claims_onchain alter column reward_amount   type text using reward_amount::text;
