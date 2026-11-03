-- Organizer tool: give someone a NEW one-time password (forgot password).
-- Edit the two values, run in Supabase -> SQL Editor, then send them the password.
-- On their next sign-in the site makes them choose their own.
-- Run this in Supabase only. Never commit real emails or passwords to GitHub.

with v as (select 'friend@example.com'::text as email, 'Bosphorus-4821'::text as temp_password)
update auth.users u
set encrypted_password = extensions.crypt(v.temp_password, extensions.gen_salt('bf')),
    updated_at = now()
from v where u.email = v.email;

update public.crew_members set password_set = false where email = 'friend@example.com';
