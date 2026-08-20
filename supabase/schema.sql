-- ============================================================================
-- Taskify — Supabase (Postgres) schema
-- ============================================================================
--
-- Taskify.sol is the source of truth for anything that moves money or gates
-- a permission (registration, escrow, votes, payouts). This database never
-- overrides on-chain state. It exists for three reasons only:
--
--   1. OFF-CHAIN CONTENT the contract intentionally doesn't store because
--      it's too expensive or the wrong shape for chain storage — task
--      descriptions, tags, images, comments, bios, linked-account handles.
--
--   2. AN INDEXED CACHE/MIRROR of on-chain state, kept in sync by a backend
--      event indexer (listens to Taskify.sol events, e.g. via viem +
--      a queue/cron). Lets the UI list/search/paginate/filter tasks and
--      users without hammering the RPC endpoint on every page load.
--      Tables in this category are marked "[on-chain cache]" below —
--      never write to them from client code; only the indexer's
--      service-role connection should.
--
--   3. PURELY OFF-CHAIN app concerns that have no on-chain equivalent at
--      all — notification preferences, a notification feed, OAuth profile
--      metadata.
--
-- Wallet address is the identity key throughout (not Supabase's built-in
-- email/OAuth auth). Auth is assumed to be Sign-In-With-Ethereum: the
-- backend verifies a signature and mints a Supabase JWT with the wallet
-- address as a custom claim, e.g. `auth.jwt() ->> 'address'`. RLS policies
-- below reference that claim — adjust the claim name to match whatever
-- SIWE integration is actually wired up.
--
-- Conventions:
--   - Addresses are stored lowercased (`address = lower(address)` check) —
--     always lowercase before querying or inserting.
--   - Token amounts and vote weights are raw base units (18 decimals for
--     MUSD/MEZO), stored as `text`, not `numeric` — PostgREST serializes
--     `numeric` as a bare JSON number, and 18-decimal amounts routinely
--     exceed Number.MAX_SAFE_INTEGER, so any standard JSON.parse (including
--     inside supabase-js) silently corrupts them. `text` round-trips exactly;
--     parse with BigInt(value) and format with the same helpers the
--     frontend already uses (formatUnits).
--   - All on-chain timestamps are `timestamptz`, converted from the
--     contract's unix-seconds `block.timestamp`.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Enums ───────────────────────────────────────────────────────────────────

create type user_role as enum ('creator', 'contributor');
create type task_status as enum (
  'GRANT_PENDING', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED',
  'FUNDS_RELEASED', 'CANCELLED', 'EXPIRED', 'GRANT_REJECTED'
);
create type funding_type as enum ('self', 'grant');
create type task_kind as enum ('development', 'community');
create type notification_type as enum (
  'task_assigned', 'work_submitted', 'funds_released', 'grant_vote_opened', 'wave_reward_ready',
  'task_applied', 'community_task_joined', 'task_comment', 'comment_reply'
);

-- ============================================================================
-- 1. OFF-CHAIN CONTENT
-- ============================================================================

-- Off-chain extension of the on-chain User (users_onchain, below). One row
-- per wallet, created the first time that address touches the app (doesn't
-- require on-chain registration — e.g. a visitor who links GitHub/X before
-- registering).
create table profiles (
  address              text primary key check (address = lower(address)),
  display_name         text, -- optional off-chain override — Taskify.sol has no setUsername, the on-chain username is permanent
  bio                  text,
  github_handle        text,
  github_display_name  text,
  github_avatar_url    text,
  x_handle             text,
  x_display_name       text,
  x_avatar_url         text,
  google_email         text, -- the required identity as of the Google-first registration flow
  google_name          text,
  google_avatar_url    text,
  custom_avatar_url    text, -- user-uploaded profile picture (data URI), takes priority over provider avatars
  email                text, -- optional, opt-in; only used to mirror in-app notifications
  notification_prefs   jsonb not null default jsonb_build_object(
    'task_assigned', true,
    'work_submitted', true,
    'funds_released', true,
    'grant_vote_opened', true,
    'wave_reward_ready', true,
    'task_comment', true,
    'comment_reply', true
  ),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Rich task content the contract doesn't store (Task.sol only persists
-- `title`). One row per on-chain task id — created off-chain at the same
-- moment createTask/createCommunityTask is submitted (client writes this
-- row right before/after the transaction; task_id is only final once the
-- TaskCreated event confirms, so consider writing with a client-generated
-- draft id and reconciling on confirmation, or writing after confirmation
-- and accepting a brief "task exists on-chain but has no description yet"
-- window).
create table task_content (
  task_id              bigint primary key, -- matches Taskify.sol's on-chain taskId
  description          text not null,
  tags                 text[] not null default '{}',
  github_repo_url      text,
  grant_justification  text,
  images               text[] not null default '{}', -- Supabase Storage URLs
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Development-task applications. applyForTask() on-chain only records
-- (task_id, applicant, timestamp) — the motivation text a contributor
-- writes has nowhere on-chain to live.
create table task_applications (
  id               uuid primary key default gen_random_uuid(),
  task_id          bigint not null,
  applicant_address text not null references profiles(address),
  motivation       text not null,
  applied_at       timestamptz not null default now(), -- indexer overwrites with on-chain event timestamp once confirmed
  created_at       timestamptz not null default now(),
  unique (task_id, applicant_address)
);

-- Development-task work submissions. submitTask() on-chain only flips
-- Status to Submitted — the PR/issue links the assignee is actually
-- submitting for review have nowhere on-chain to live. One row per task
-- (a task has at most one assignee at a time).
create table task_submissions (
  task_id          bigint primary key,
  assignee_address text not null references profiles(address),
  pr_url           text not null,
  issue_url        text,
  payout_tx_hash   text, -- approveAndRelease() tx hash, set once the creator approves — lets anyone verify the payout directly
  submitted_at     timestamptz not null default now()
);

-- Discussion thread on a task (any task, any registered visitor), with
-- one-level reply support. Entirely off-chain and social — never gates
-- anything the contract cares about.
create table task_comments (
  id            uuid primary key default gen_random_uuid(),
  task_id       bigint not null,
  author_address text not null references profiles(address),
  body          text not null,
  reply_to      uuid references task_comments(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index task_comments_task_id_idx on task_comments(task_id);
create index task_comments_reply_to_idx on task_comments(reply_to);

-- ============================================================================
-- 2. ON-CHAIN CACHE — populated only by the event indexer (service-role
--    writes only). Never accept client writes to these tables; the contract
--    is the only valid source for their data.
-- ============================================================================

-- [on-chain cache] mirrors Taskify.sol's `users` mapping.
create table users_onchain (
  address                 text primary key check (address = lower(address)),
  username                text not null,
  role                    user_role not null,
  experience_level        smallint not null default 0,
  tasks_completed         bigint not null default 0,
  total_earned            text not null default '0', -- raw base units, as text — see header note
  github_verified         boolean not null default false,
  x_verified              boolean not null default false,
  registered_at           timestamptz not null,
  last_experience_update  timestamptz not null,
  last_synced_block       bigint not null,
  last_synced_at          timestamptz not null default now()
);
create index users_onchain_role_idx on users_onchain(role);

-- [on-chain cache] mirrors Taskify.sol's `tasks` mapping (the fields the
-- contract actually stores — pairs with task_content for the rest).
create table tasks (
  id                bigint primary key, -- on-chain taskId
  creator_address   text not null references users_onchain(address),
  title             text not null,
  amount            text not null,   -- raw base units, as text — see header note
  token_address     text not null,
  experience_min    smallint not null default 0,
  experience_max    smallint not null default 0,
  status            task_status not null,
  funding_type      funding_type not null,
  kind              task_kind not null,
  max_winners       smallint,           -- community only
  assignee_address  text references users_onchain(address), -- development only
  winners           text[],             -- community only, set on WinnersSelected
  deadline          timestamptz not null,
  created_at        timestamptz not null,
  tx_hash_created   text not null,
  last_synced_block bigint not null,
  last_synced_at    timestamptz not null default now()
);
create index tasks_status_idx on tasks(status);
create index tasks_kind_idx on tasks(kind);
create index tasks_creator_idx on tasks(creator_address);
create index tasks_assignee_idx on tasks(assignee_address);

-- [on-chain cache] mirrors taskApplicantAppliedAt for Development tasks —
-- lets the UI show "applied" state without an RPC call per row. The
-- motivation text itself lives in task_applications (off-chain-only).
create table task_applicants_onchain (
  task_id          bigint not null,
  applicant_address text not null references users_onchain(address),
  applied_at       timestamptz not null,
  primary key (task_id, applicant_address)
);

-- [on-chain cache] mirrors taskApplicantAppliedAt + taskSubmissions for
-- Community tasks (join() call + proof URL). The contract is still the
-- authority on proof_url content — this is a read cache for fast listing.
create table community_submissions (
  task_id             bigint not null,
  participant_address text not null references users_onchain(address),
  proof_url           text not null,
  joined_at           timestamptz not null,
  is_winner           boolean not null default false, -- set on WinnersSelected
  payout_tx_hash      text, -- selectWinners() tx hash, set alongside is_winner — same hash for every winner in the batch
  primary key (task_id, participant_address)
);
create index community_submissions_task_idx on community_submissions(task_id);

-- [on-chain cache] mirrors Taskify.sol's `patrons` mapping.
create table patrons_onchain (
  address          text primary key references users_onchain(address),
  total_deposited  text not null default '0',
  tier             smallint not null default 99,
  last_synced_at   timestamptz not null default now()
);

-- [on-chain cache] mirrors `grantVotes` + aggregated GrantVoted events.
create table grant_votes_onchain (
  task_id       bigint primary key references tasks(id),
  votes_for     text not null default '0',
  votes_against text not null default '0',
  deadline      timestamptz not null,
  executed      boolean not null default false,
  approved      boolean -- null until GrantExecuted fires
);

-- [on-chain cache] individual votes, for a transparent per-task voter list.
create table grant_voters_onchain (
  task_id      bigint not null references grant_votes_onchain(task_id),
  voter_address text not null references users_onchain(address),
  support      boolean not null,
  weight       text not null,
  voted_at     timestamptz not null,
  primary key (task_id, voter_address)
);

-- [on-chain cache] mirrors waveSnapshots.
create table wave_snapshots_onchain (
  wave_id      bigint primary key,
  pool_amount  text not null,
  total_tasks  integer not null,
  started_at   timestamptz not null,
  finished_at  timestamptz not null
);

-- [on-chain cache] mirrors waveClaims / WaveRewardClaimed events.
create table wave_claims_onchain (
  wave_id         bigint not null references wave_snapshots_onchain(wave_id),
  creator_address text not null references users_onchain(address),
  reward_amount   text not null,
  claimed_at      timestamptz not null,
  tx_hash         text not null,
  primary key (wave_id, creator_address)
);

-- Indexer bookkeeping — where the event-listener resumes from after a
-- restart. One row per chain (testnet/mainnet) if ever indexing both.
create table indexer_state (
  chain_id          bigint primary key,
  last_synced_block bigint not null,
  updated_at        timestamptz not null default now()
);

-- ============================================================================
-- 3. PURELY OFF-CHAIN APP CONCERNS
-- ============================================================================

-- Notification feed, generated by the indexer when a relevant on-chain
-- event fires for a given address (cross-referenced against
-- profiles.notification_prefs before insert).
create table notifications (
  id                uuid primary key default gen_random_uuid(),
  recipient_address text not null references profiles(address),
  type              notification_type not null,
  task_id           bigint,
  read              boolean not null default false,
  created_at        timestamptz not null default now()
);
create index notifications_recipient_idx on notifications(recipient_address, read);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Assumes a SIWE-issued JWT with the wallet address in a custom claim,
-- referenced here as auth.jwt() ->> 'address'. Swap for whatever the actual
-- auth bridge produces.

alter table profiles enable row level security;
alter table task_content enable row level security;
alter table task_applications enable row level security;
alter table task_submissions enable row level security;
alter table task_comments enable row level security;
alter table notifications enable row level security;

-- On-chain cache tables: world-readable, writes restricted to the
-- indexer's service-role key (service_role bypasses RLS by default in
-- Supabase, so no explicit write policy is needed/should be added here —
-- that's what keeps client code from ever mutating chain-derived data).
alter table users_onchain enable row level security;
alter table tasks enable row level security;
alter table task_applicants_onchain enable row level security;
alter table community_submissions enable row level security;
alter table patrons_onchain enable row level security;
alter table grant_votes_onchain enable row level security;
alter table grant_voters_onchain enable row level security;
alter table wave_snapshots_onchain enable row level security;
alter table wave_claims_onchain enable row level security;

create policy "public read" on users_onchain for select using (true);
create policy "public read" on tasks for select using (true);
create policy "public read" on task_applicants_onchain for select using (true);
create policy "public read" on community_submissions for select using (true);
create policy "public read" on patrons_onchain for select using (true);
create policy "public read" on grant_votes_onchain for select using (true);
create policy "public read" on grant_voters_onchain for select using (true);
create policy "public read" on wave_snapshots_onchain for select using (true);
create policy "public read" on wave_claims_onchain for select using (true);

create policy "public read" on profiles for select using (true);
create policy "own profile write" on profiles
  for insert with check (address = auth.jwt() ->> 'address');
create policy "own profile update" on profiles
  for update using (address = auth.jwt() ->> 'address');

create policy "public read" on task_content for select using (true);
create policy "creator writes own task content" on task_content
  for insert with check (
    task_id in (select id from tasks where creator_address = auth.jwt() ->> 'address')
  );
create policy "creator updates own task content" on task_content
  for update using (
    task_id in (select id from tasks where creator_address = auth.jwt() ->> 'address')
  );

create policy "public read" on task_applications for select using (true);
create policy "own application write" on task_applications
  for insert with check (applicant_address = auth.jwt() ->> 'address');

create policy "public read" on task_submissions for select using (true);
create policy "own submission write" on task_submissions
  for insert with check (assignee_address = auth.jwt() ->> 'address');
create policy "own submission update" on task_submissions
  for update using (assignee_address = auth.jwt() ->> 'address');

create policy "public read" on task_comments for select using (true);
create policy "own comment write" on task_comments
  for insert with check (author_address = auth.jwt() ->> 'address');

create policy "own notifications only" on notifications
  for select using (recipient_address = auth.jwt() ->> 'address');
create policy "mark own notifications read" on notifications
  for update using (recipient_address = auth.jwt() ->> 'address');
