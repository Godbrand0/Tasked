-- Opt-in alerts for newly posted tasks, one type per kind so people can follow
-- Development tasks, Community tasks, or both:
--   new_dev_task        — a Development task just opened
--   new_community_task  — a Community task just opened
-- Both are opt-in: the recipient's notification_prefs must have the key set to
-- true (a missing key means off), unlike the older types where missing = on.
--
-- Postgres requires enum additions to run outside a transaction block —
-- run these two statements on their own in the Supabase SQL editor, before 0020.

alter type notification_type add value if not exists 'new_dev_task';
alter type notification_type add value if not exists 'new_community_task';
