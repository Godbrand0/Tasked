-- One Google/email identity per wallet. Until now profiles.google_email was
-- free text, so the same Gmail could be tied to any number of wallets. With
-- Privy email/Google login that would let one person open a second account
-- from a fresh embedded wallet.
--
-- normalize_email() must match lib/email-normalize.ts: lowercase everywhere;
-- for gmail.com / googlemail.com also drop dots and any +tag in the local part.

create or replace function normalize_email(raw text) returns text
language sql immutable strict as $$
  select case
    when split_part(lower(btrim(raw)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(raw)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else lower(btrim(raw))
  end
$$;

alter table profiles
  add column google_email_normalized text
  generated always as (normalize_email(google_email)) stored;

-- If this fails, two wallets already share a Gmail. Find them with:
--   select google_email_normalized, array_agg(address)
--   from profiles where google_email_normalized is not null
--   group by 1 having count(*) > 1;
-- then clear google_email on the wallet that should lose it and re-run.
create unique index profiles_google_email_normalized_key
  on profiles (google_email_normalized)
  where google_email_normalized is not null;
