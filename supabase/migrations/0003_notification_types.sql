-- Adds notification types for events the app can synthesize directly at
-- write-time (no indexer needed for these — the API route that records the
-- off-chain side of the action inserts the notification itself):
--   task_applied          — a contributor applied to a Development task
--   community_task_joined — someone joined a Community task
--
-- Postgres requires enum additions to run outside a transaction block —
-- run this statement alone in the Supabase SQL editor.

alter type notification_type add value if not exists 'task_applied';
alter type notification_type add value if not exists 'community_task_joined';
