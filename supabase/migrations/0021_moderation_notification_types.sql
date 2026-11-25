-- Notification types for task moderation (see 0020_task_moderation.sql):
--   task_flagged      admin: a new or edited task matched a keyword and is waiting for review
--   task_reported     admin: someone reported a task
--   creator_reported  admin: someone reported a creator for not paying
--   task_approved     creator: an admin approved their task, it's live
--   task_removed      creator: an admin removed their task from Taskify
--
-- Postgres requires enum additions to run outside a transaction block, so
-- run this file on its own in the Supabase SQL editor, after 0020.

alter type notification_type add value if not exists 'task_flagged';
alter type notification_type add value if not exists 'task_reported';
alter type notification_type add value if not exists 'creator_reported';
alter type notification_type add value if not exists 'task_approved';
alter type notification_type add value if not exists 'task_removed';
