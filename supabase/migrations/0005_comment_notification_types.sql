-- Adds notification types for the task comment thread:
--   task_comment  — someone left a top-level comment on your task
--   comment_reply — someone replied to your comment
--
-- Postgres requires enum additions to run outside a transaction block —
-- run this statement alone in the Supabase SQL editor.

alter type notification_type add value if not exists 'task_comment';
alter type notification_type add value if not exists 'comment_reply';
