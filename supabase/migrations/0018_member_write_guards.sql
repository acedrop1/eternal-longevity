-- =============================================================================
-- 0018_member_write_guards — row ownership is not column ownership.
--
-- RLS says WHICH rows a member may write. It says nothing about WHICH COLUMNS,
-- so "profiles: update own or admin" let a member set their own role to
-- 'admin', un-suspend themselves or swap stripe_customer_id; "subs: owner or
-- admin updates" let them set per_cycle_cents to 1 or move pending_review to
-- active; and the intake / ID inserts accepted any status, including approved.
--
-- These BEFORE triggers sit behind the existing policies and raise when a
-- signed-in, non-staff caller touches a column that is not theirs to set.
-- Service-role writes (every server action that uses the admin client, the
-- crons, the Stripe webhook), the SQL editor, SECURITY DEFINER functions such
-- as on_auth_user_created, and admins are untouched.
--
-- "Privileged" is decided by current_user, not auth.role(): PostgREST switches
-- to 'authenticated' / 'anon' for session and anon-key requests and to
-- 'service_role' for the service key, while the SQL editor and SECURITY
-- DEFINER functions run as the owning role. So anything other than
-- authenticated/anon is trusted server code.
--
-- The profile guard is an allowlist: a column added later is staff-only until
-- it is added to the list below.
--
-- Safe to re-run.
--
-- Verify after running:
--   select tgrelid::regclass as tbl, tgname
--   from pg_trigger where tgname like '%member_write_guard%' order by 1;
--   -- expect 5 rows: profiles, subscriptions, intake_submissions,
--   -- id_verifications, messages
--
--   select policyname, cmd from pg_policies
--   where schemaname = 'storage' and policyname like 'idv storage:%';
--   -- expect: member uploads to own folder (INSERT), member reads own folder
--   -- (SELECT), clinical reads all (SELECT) — and no "member manages own folder"
--
-- Smoke test as a member (SQL editor):
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<member uuid>","role":"authenticated"}';
--   update profiles set role = 'admin' where id = '<member uuid>';   -- must fail 42501
--   update profiles set phone = '555' where id = '<member uuid>';    -- must succeed
-- (run inside begin; ... rollback;)
-- =============================================================================

-- True for trusted server code: service role, SQL editor, SECURITY DEFINER.
create or replace function member_write_privileged()
returns boolean language sql stable as $$
  select current_user::text not in ('authenticated', 'anon');
$$;

-- -----------------------------------------------------------------------------
-- profiles: a member may change only their own contact details, notification
-- preferences and cart. role, account_status, stripe_customer_id, email,
-- two_factor_enabled, npi, credential and licence columns are staff-only.
-- -----------------------------------------------------------------------------
create or replace function profiles_member_write_guard()
returns trigger language plpgsql as $$
declare
  member_cols constant text[] := array[
    'full_name', 'phone', 'date_of_birth', 'notification_prefs',
    'cart', 'cart_updated_at', 'cart_reminder_at', 'updated_at'
  ];
begin
  if member_write_privileged() or is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - member_cols) is distinct from (to_jsonb(old) - member_cols) then
    raise exception 'profiles: only full_name, phone, date_of_birth, notification_prefs and cart can be changed here'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_member_write_guard on profiles;
create trigger profiles_member_write_guard before update on profiles
  for each row execute function profiles_member_write_guard();

-- -----------------------------------------------------------------------------
-- subscriptions: a member may pause, resume and cancel. Nothing else — price,
-- cadence, dates, product and prescription are set by the server. A plan the
-- renewal job put in pending_review stays there until staff act.
-- -----------------------------------------------------------------------------
create or replace function subscriptions_member_write_guard()
returns trigger language plpgsql as $$
begin
  if member_write_privileged() or is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - array['status', 'updated_at'])
     is distinct from (to_jsonb(old) - array['status', 'updated_at']) then
    raise exception 'subscriptions: members can only pause, resume or cancel'
      using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'active' and new.status = 'paused')
    or (old.status = 'paused' and new.status = 'active')
    or (old.status in ('active', 'paused', 'pending_review') and new.status = 'canceled')
  ) then
    raise exception 'subscriptions: a member cannot move a plan from % to %', old.status, new.status
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_member_write_guard on subscriptions;
create trigger subscriptions_member_write_guard before update on subscriptions
  for each row execute function subscriptions_member_write_guard();

-- -----------------------------------------------------------------------------
-- intake_submissions: the app inserts through the service role with status
-- 'awaiting_visit'. A member inserting directly gets exactly that and nothing
-- that skips the visit or looks reviewed.
-- -----------------------------------------------------------------------------
create or replace function intake_member_write_guard()
returns trigger language plpgsql as $$
begin
  if member_write_privileged() or is_clinical() then
    return new;
  end if;
  if new.status::text <> 'awaiting_visit'
     or new.assigned_doctor_id is not null
     or new.review_notes is not null
     or new.reminder_at is not null then
    raise exception 'intake_submissions: a new intake starts at awaiting_visit, unreviewed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists intake_member_write_guard on intake_submissions;
create trigger intake_member_write_guard before insert on intake_submissions
  for each row execute function intake_member_write_guard();

-- -----------------------------------------------------------------------------
-- id_verifications: a member submits a pending, unreviewed record that points
-- at their own storage folder — never someone else's uploaded ID.
-- -----------------------------------------------------------------------------
create or replace function idv_member_write_guard()
returns trigger language plpgsql as $$
begin
  if member_write_privileged() or is_clinical() then
    return new;
  end if;
  if new.status <> 'pending'
     or new.reviewed_by is not null
     or new.reviewed_at is not null
     or split_part(new.storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'id_verifications: submit a pending record for your own upload folder'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists idv_member_write_guard on id_verifications;
create trigger idv_member_write_guard before insert on id_verifications
  for each row execute function idv_member_write_guard();

-- -----------------------------------------------------------------------------
-- messages: a member's message arrives unread and stamped now, so it cannot
-- hide from the staff inbox or be backdated.
-- -----------------------------------------------------------------------------
create or replace function messages_member_write_guard()
returns trigger language plpgsql as $$
begin
  if member_write_privileged() or is_clinical() then
    return new;
  end if;
  new.read_at := null;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists messages_member_write_guard on messages;
create trigger messages_member_write_guard before insert on messages
  for each row execute function messages_member_write_guard();

-- -----------------------------------------------------------------------------
-- Storage: the ID bucket policy was FOR ALL, so a member could overwrite or
-- delete their ID images after they were approved. Members now upload new
-- files and read their own; they cannot replace or remove them.
-- IdVerificationForm uploads to a fresh <uid>/<timestamp>/ folder with
-- upsert off, which is an INSERT.
-- -----------------------------------------------------------------------------
drop policy if exists "idv storage: member manages own folder" on storage.objects;

drop policy if exists "idv storage: member uploads to own folder" on storage.objects;
create policy "idv storage: member uploads to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "idv storage: member reads own folder" on storage.objects;
create policy "idv storage: member reads own folder"
  on storage.objects for select
  using (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
