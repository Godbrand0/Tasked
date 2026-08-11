-- Google becomes the required registration identity (replacing the
-- GitHub-or-X requirement); GitHub/X move to optional post-registration
-- links. See app/api/auth/google/ and lib/wallet-context.tsx.
alter table profiles add column google_email text;
alter table profiles add column google_name text;
alter table profiles add column google_avatar_url text;
