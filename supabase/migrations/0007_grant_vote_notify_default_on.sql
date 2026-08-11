-- grant_vote_opened previously defaulted to false and was never actually
-- fired by any code path, so no one could have meaningfully opted out of it
-- yet. Now that new grant applications notify all patrons (in-app + email),
-- flip the default to on and backfill existing rows still sitting on the
-- old default so current patrons aren't silently excluded.

alter table profiles
  alter column notification_prefs set default jsonb_build_object(
    'task_assigned', true,
    'work_submitted', true,
    'funds_released', true,
    'grant_vote_opened', true,
    'wave_reward_ready', true,
    'task_comment', true,
    'comment_reply', true
  );

update profiles
  set notification_prefs = jsonb_set(notification_prefs, '{grant_vote_opened}', 'true')
  where notification_prefs->>'grant_vote_opened' = 'false';
