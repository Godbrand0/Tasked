-- Task moderation: keyword screening, user reports, admin review.
--
-- Tasks live on-chain and only their creator can cancel them, so moderation
-- here only controls what Taskify shows. A hidden task keeps its escrow
-- until the creator cancels it.
--
-- Every table is service_role only (RLS on, no policies). The app reads and
-- writes them through API routes: /api/moderation (public hidden list),
-- /api/reports and /api/admin/moderation (admin wallets only).
--
-- Run 0021_moderation_notification_types.sql too.

-- Words and phrases that send a new or edited task to admin review instead of
-- going live. Matched case-insensitively as whole words (lib/moderation.ts).
create table moderation_keywords (
  term       text primary key check (term = lower(btrim(term)) and term <> ''),
  created_at timestamptz not null default now()
);

insert into moderation_keywords (term) values
  -- gambling
  ('casino'), ('gambling'), ('betting'), ('sportsbook'), ('slots'), ('poker'),
  -- scams and wallet theft
  ('seed phrase'), ('recovery phrase'), ('private key'), ('mnemonic'),
  ('guaranteed returns'), ('guaranteed profit'), ('double your'), ('100x'),
  ('presale'), ('pre-sale'), ('airdrop claim'), ('claim airdrop'),
  ('drainer'), ('send funds'), ('connect your wallet'), ('giveaway'),
  -- adult content
  ('porn'), ('nsfw'), ('onlyfans'), ('escort'), ('nude'), ('nudes'), ('xxx'), ('sex'),
  -- drugs and weapons
  ('cocaine'), ('heroin'), ('meth'), ('mdma'), ('fentanyl'), ('cannabis'),
  ('firearm'), ('firearms'), ('gun'), ('guns'), ('ammo'), ('weapon'), ('weapons'),
  -- fake engagement
  ('buy followers'), ('fake followers'), ('bot followers'), ('fake reviews'),
  ('buy accounts'), ('sell accounts'),
  -- hacking
  ('hack account'), ('hack into'), ('phishing'), ('ddos'), ('carding'), ('stolen'),
  -- advertising (Taskify is for work, not ad placements)
  ('advertise'), ('advertisement'), ('paid ad'), ('sponsored post'), ('paid post')
on conflict do nothing;

alter table moderation_keywords enable row level security;

-- One row per task that has been through moderation. No row = live.
--   pending_review  matched a keyword (or the creator is blocked); hidden until an admin decides
--   approved        an admin cleared it; approved_terms are the matches they saw, so
--                   re-saving the same text doesn't send it back to review
--   hidden          an admin removed it from Taskify
create table task_moderation (
  task_id        bigint primary key,
  status         text not null check (status in ('pending_review', 'approved', 'hidden')),
  flagged_terms  text[] not null default '{}',
  approved_terms text[] not null default '{}',
  note           text,
  reviewed_by    text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index task_moderation_status_idx on task_moderation(status);

alter table task_moderation enable row level security;

-- User reports. kind = 'task' (the task itself breaks the rules) or
-- 'creator' (the creator didn't pay as promised; only people who applied to
-- or joined the task on-chain can file one). One report per person per task
-- per kind.
create table moderation_reports (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('task', 'creator')),
  task_id          bigint not null,
  target_address   text not null check (target_address = lower(target_address)), -- the task's creator
  reporter_address text not null check (reporter_address = lower(reporter_address)),
  reason           text not null,
  details          text check (char_length(details) <= 1000),
  status           text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by      text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (kind, task_id, reporter_address)
);
create index moderation_reports_status_idx on moderation_reports(status, created_at desc);

alter table moderation_reports enable row level security;

-- Admin decisions about a creator. warned shows a badge on their profile;
-- blocked also sends every new task they post to review.
create table creator_standing (
  address    text primary key check (address = lower(address)),
  status     text not null check (status in ('warned', 'blocked')),
  note       text,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table creator_standing enable row level security;
