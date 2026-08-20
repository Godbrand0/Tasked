-- Taskify.sol removed the Investor role — depositToPool (support) and
-- voteOnGrant (vote) are now independent of role, gated only by
-- registration / approvedVoters + veBTC weight respectively. Only
-- creator/contributor remain as registrable roles. mezo_staked mirrored a
-- field dropped from the Patron struct (unstakeMezo was migration-only
-- dead code with nothing left to migrate on a fresh deploy).
update users_onchain set role = 'contributor' where role = 'investor';

alter type user_role rename to user_role_old;
create type user_role as enum ('creator', 'contributor');
alter table users_onchain alter column role type user_role using role::text::user_role;
drop type user_role_old;

alter table patrons_onchain drop column mezo_staked;
