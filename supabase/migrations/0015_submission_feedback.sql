-- Threaded feedback on a single participant's community-task submission.
-- The task owner asks for changes; the participant can reply (e.g. with an
-- updated proof link). Entirely off-chain and social — joinCommunityTask()
-- is one-shot on-chain (reverts AlreadyApplied on a second call), and
-- selectWinners() never reads submission content, so this thread is where
-- the actual review conversation happens.
--
-- Pairs with the 'submission_feedback' notification type added in
-- 0016_submission_feedback_notification_type.sql (enum add must run alone).

create table submission_feedback (
  id                  uuid primary key default gen_random_uuid(),
  task_id             bigint not null,
  participant_address text not null references profiles(address), -- whose submission the thread is about
  author_address      text not null references profiles(address), -- who wrote this message (owner or that participant)
  body                text not null,
  created_at          timestamptz not null default now()
);
create index submission_feedback_thread_idx
  on submission_feedback(task_id, participant_address, created_at);

alter table submission_feedback enable row level security;

-- Read is public (the participants list is visible to anyone on a community
-- task). Writes go through the service-role API route
-- (app/api/submissions/feedback), which authorizes the author as either the
-- task creator or the participant — no client write policy.
create policy "public read" on submission_feedback for select using (true);
