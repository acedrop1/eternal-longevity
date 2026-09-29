-- =============================================================================
-- 0019_intake_media — private storage for visit photos and lab results.
--
-- Hair and skin visits ask for guided photos; the hormone visit accepts lab
-- results. Files live in the private bucket `intake-media` under the member's
-- own folder: <auth uid>/<visit uuid>/<field>-<slot>.jpg
--
-- Members can upload into, and read from, only their own folder. They cannot
-- overwrite or delete a file once submitted. Clinical staff (doctor, admin)
-- can read everything; the prescriber view uses short-lived signed URLs.
--
-- Safe to re-run.
--
-- Verify after running:
--   select id, public, file_size_limit from storage.buckets where id = 'intake-media';
--   -- expect one row, public = false, 10485760
--   select policyname, cmd from pg_policies
--   where schemaname = 'storage' and policyname like 'intake media:%';
--   -- expect 3 rows: member uploads (INSERT), member reads own (SELECT),
--   -- clinical reads all (SELECT)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'intake-media',
  'intake-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "intake media: member uploads to own folder" on storage.objects;
create policy "intake media: member uploads to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'intake-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "intake media: member reads own folder" on storage.objects;
create policy "intake media: member reads own folder"
  on storage.objects for select
  using (
    bucket_id = 'intake-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "intake media: clinical reads all" on storage.objects;
create policy "intake media: clinical reads all"
  on storage.objects for select
  using (bucket_id = 'intake-media' and is_clinical());
