-- Development-task work submissions. submitTask() on-chain only flips
-- Status to Submitted — the PR/issue links the assignee is actually
-- submitting for review have nowhere on-chain to live. One row per task
-- (a task has at most one assignee at a time).
create table task_submissions (
  task_id          bigint primary key,
  assignee_address text not null references profiles(address),
  pr_url           text not null,
  issue_url        text,
  submitted_at     timestamptz not null default now()
);

alter table task_submissions enable row level security;

create policy "public read" on task_submissions for select using (true);
create policy "own submission write" on task_submissions
  for insert with check (assignee_address = auth.jwt() ->> 'address');
create policy "own submission update" on task_submissions
  for update using (assignee_address = auth.jwt() ->> 'address');
