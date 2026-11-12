-- profiles had `public read ... using (true)`, and the anon key ships to the
-- browser, so anyone could read every user's email, google_email and
-- notification_prefs straight from Supabase's REST API.
--
-- Keep public profile data readable, but take the private columns away from
-- anon/authenticated. The app only reads profiles through API routes using
-- service_role (lib/supabase-admin.ts), which isn't affected by these grants;
-- /api/profile returns the private fields only to the verified owner.

revoke select on profiles from anon, authenticated;

grant select (
  address,
  display_name,
  bio,
  github_handle,
  github_display_name,
  github_avatar_url,
  x_handle,
  x_display_name,
  x_avatar_url,
  google_name,
  google_avatar_url,
  custom_avatar_url,
  created_at,
  updated_at
) on profiles to anon, authenticated;
