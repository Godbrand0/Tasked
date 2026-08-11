-- User-uploaded profile picture, stored as a data URI (same pattern as
-- task_content.images). Takes priority over provider avatars (Google/
-- GitHub/X) once set — see lib/wallet-context.tsx's avatarUrl.
alter table profiles add column custom_avatar_url text;
