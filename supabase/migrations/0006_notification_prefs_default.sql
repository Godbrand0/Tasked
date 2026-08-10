-- Adds the two new comment notification types to the default
-- notification_prefs on new profile rows (existing rows are unaffected —
-- notify() already treats a missing key as enabled, so this is purely
-- cosmetic for future signups, not required for the notifications to work).

alter table profiles
  alter column notification_prefs set default jsonb_build_object(
    'task_assigned', true,
    'work_submitted', true,
    'funds_released', true,
    'grant_vote_opened', false,
    'wave_reward_ready', true,
    'task_comment', true,
    'comment_reply', true
  );
