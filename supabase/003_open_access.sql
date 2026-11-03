-- Operation Bosphorus: open access (no sign-in).
-- Anyone with the site link can read and change trip data and photos.
-- Run once in Supabase -> SQL Editor, after schema.sql. Safe to re-run.

-- Shared data: open to the site's public (publishable) key
drop policy if exists "crew reads docs"   on public.docs;
drop policy if exists "crew inserts docs" on public.docs;
drop policy if exists "crew updates docs" on public.docs;
drop policy if exists "crew deletes docs" on public.docs;
drop policy if exists "open reads docs"   on public.docs;
drop policy if exists "open inserts docs" on public.docs;
drop policy if exists "open updates docs" on public.docs;
drop policy if exists "open deletes docs" on public.docs;
create policy "open reads docs"   on public.docs for select to anon, authenticated using (true);
create policy "open inserts docs" on public.docs for insert to anon, authenticated with check (true);
create policy "open updates docs" on public.docs for update to anon, authenticated using (true) with check (true);
create policy "open deletes docs" on public.docs for delete to anon, authenticated using (true);

-- Photos/videos: bucket stays private (no public listing); files open through signed links
drop policy if exists "crew views vault"   on storage.objects;
drop policy if exists "crew uploads vault" on storage.objects;
drop policy if exists "crew deletes vault" on storage.objects;
drop policy if exists "open views vault"   on storage.objects;
drop policy if exists "open uploads vault" on storage.objects;
drop policy if exists "open deletes vault" on storage.objects;
create policy "open views vault"   on storage.objects for select to anon, authenticated using (bucket_id = 'vault');
create policy "open uploads vault" on storage.objects for insert to anon, authenticated with check (bucket_id = 'vault');
create policy "open deletes vault" on storage.objects for delete to anon, authenticated using (bucket_id = 'vault');

notify pgrst, 'reload schema';
