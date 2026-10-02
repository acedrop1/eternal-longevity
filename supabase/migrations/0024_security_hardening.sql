-- =============================================================================
-- 0024_security_hardening — close member write paths the app never uses.
--
-- 1. assessment_drafts: members may read their own drafts, nothing more. The
--    app writes them on the service-role client (saveAssessmentDraftAction),
--    which validates the entry point and size; a direct PostgREST write
--    skipped both.
-- 2. intake_submissions: members no longer insert directly. Every intake is
--    filed by a server action on the service role. A member-inserted
--    'awaiting_visit' row could carry its own answers (products "assessed",
--    state, consents) for the visit and the next assessment to build on.
-- 3. profiles.date_of_birth: fixed once an intake is past awaiting_visit. The
--    prescriber reviewed that age; a member could rewrite it afterwards through
--    PostgREST. Name, phone and the rest stay editable. Server code (service
--    role) and admins are untouched, as in 0018.
-- 4. profiles.placing_order_at: a per-member checkout claim. order_items holds
--    product_id, so "one open order per member and product" cannot be a
--    partial unique index on orders; placeOrderAction claims this column with
--    one conditional UPDATE instead (src/lib/order-lock.ts), so a double
--    submit cannot create two orders. Not in the 0018 member allowlist, so
--    members cannot set it.
--
-- Safe to re-run.
--
-- Verify after running:
--   select policyname, cmd from pg_policies where tablename = 'assessment_drafts';
--   -- expect one row: "assessment drafts: owner reads", SELECT
--
--   select policyname from pg_policies
--   where tablename = 'intake_submissions' and cmd = 'INSERT';
--   -- expect no "intake: member inserts own"
--
--   select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name = 'placing_order_at';
--   -- expect 1 row
--
-- Smoke test as a member with a submitted intake (inside begin; ... rollback;):
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<member uuid>","role":"authenticated"}';
--   update profiles set date_of_birth = '1950-01-01' where id = '<member uuid>';  -- must fail 42501
--   update profiles set full_name = 'New Name' where id = '<member uuid>';        -- must succeed
--   update profiles set placing_order_at = now() where id = '<member uuid>';      -- must fail 42501
-- =============================================================================

-- 1. assessment_drafts: owner reads only ---------------------------------------
drop policy if exists "assessment drafts: owner" on assessment_drafts;
drop policy if exists "assessment drafts: owner reads" on assessment_drafts;
create policy "assessment drafts: owner reads" on assessment_drafts
  for select
  using (user_id = auth.uid());

-- 2. intake_submissions: no direct member inserts --------------------------------
drop policy if exists "intake: member inserts own" on intake_submissions;

-- 4. checkout claim column ----------------------------------------------------
alter table profiles add column if not exists placing_order_at timestamptz;

-- 3. profiles guard, from 0018, plus the date-of-birth lock ----------------------
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
  if new.date_of_birth is distinct from old.date_of_birth and exists (
    select 1 from intake_submissions
    where user_id = old.id and status::text <> 'awaiting_visit'
  ) then
    raise exception 'Your date of birth is on your medical record. Message your care team to change it.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_member_write_guard on profiles;
create trigger profiles_member_write_guard before update on profiles
  for each row execute function profiles_member_write_guard();
