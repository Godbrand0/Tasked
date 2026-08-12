-- Off-chain display name override — Taskify.sol's username is set once at
-- registration with no update function. Lets a user change how their name
-- shows in the app without touching the permanent on-chain identity.
alter table profiles add column display_name text;
