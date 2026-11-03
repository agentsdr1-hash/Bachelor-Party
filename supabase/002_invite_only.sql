-- Operation Bosphorus: invite-only accounts with one-time passwords.
-- Run once in Supabase -> SQL Editor (after schema.sql). Safe to re-run.

-- Tracks whether each person has replaced their one-time password.
alter table public.crew_members add column if not exists password_set boolean not null default false;

-- Called by the site right after someone sets their own password.
create or replace function public.mark_password_set() returns void
language sql security definer set search_path = public as $$
  update public.crew_members set password_set = true
  where email = lower(auth.jwt() ->> 'email')
$$;
revoke all on function public.mark_password_set() from public, anon;
grant execute on function public.mark_password_set() to authenticated;
