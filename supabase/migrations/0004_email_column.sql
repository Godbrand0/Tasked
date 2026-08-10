-- Adds an optional email column to profiles for mirroring in-app
-- notifications via email (see lib/email.ts, lib/notifications.ts).
-- Opt-in, off-chain, no verification step — a user who never sets one
-- simply never gets emailed.

alter table profiles add column if not exists email text;
