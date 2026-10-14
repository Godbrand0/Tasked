-- 1. Email verification for the optional notification email.
--    POST /api/profile is unauthenticated, so anyone could type someone else's
--    address into their own profile. That was low-impact while emails only mirrored
--    events about your own activity; opt-in new-task broadcasts go to many people,
--    so those emails are sent ONLY to an address that confirmed a signed link.
--    Changing the email resets email_verified (done in app/api/profile/route.ts).
alter table profiles add column if not exists email_verified boolean not null default false;
alter table profiles add column if not exists email_verification_sent_at timestamptz;

-- 2. One row per task that has already been broadcast. The insert is the race
--    guard: a second broadcast for the same task conflicts and sends nothing.
create table if not exists task_broadcasts (
  task_id    bigint primary key,
  created_at timestamptz not null default now()
);
