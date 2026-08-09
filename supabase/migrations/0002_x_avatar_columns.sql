-- Adds X display name / avatar columns to profiles, mirroring the existing
-- github_display_name / github_avatar_url pair. Needed now that X connects
-- via real OAuth (app/api/auth/x) and returns a profile picture, same as
-- GitHub already did — schema.sql has been updated for future deployments,
-- this migration brings the already-provisioned database in line with it.
--
-- Run this once in the Supabase SQL editor (dashboard > SQL Editor).

alter table profiles add column if not exists x_display_name text;
alter table profiles add column if not exists x_avatar_url   text;
