-- Adds the notification type for community-task submission feedback:
--   submission_feedback — the task owner (or the participant) posted to a
--                         submission's feedback thread; the other party is
--                         notified. Synthesized directly by the API route
--                         (app/api/submissions/feedback), no indexer needed.
--
-- Postgres requires enum additions to run outside a transaction block —
-- run this statement alone in the Supabase SQL editor.

alter type notification_type add value if not exists 'submission_feedback';
