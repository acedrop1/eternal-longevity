-- =============================================================================
-- 0032 — Staff database access requires a second factor (audit, Oct 18 2026)
-- =============================================================================
-- Staff sign in with a password AND an emailed code, but the code is checked by
-- the website, not by the database. A staff password alone could get a Supabase
-- token with the public anon key and read charts straight from the REST API,
-- skipping the code. From here the staff helpers also require a second-factor
-- token (aal2) and an active account. Staff screens read through the server
-- (service role) after the website has checked the code, so they are unaffected.
--
-- Run AFTER the deploy that moved listOrders/getOrder to the server for staff.

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt()->>'aal', '') = 'aal2'
     and exists (select 1 from profiles where id = auth.uid() and role = 'admin' and account_status = 'active');
$$;

create or replace function is_clinical()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt()->>'aal', '') = 'aal2'
     and exists (select 1 from profiles where id = auth.uid() and role in ('doctor', 'admin') and account_status = 'active');
$$;

create or replace function is_pharmacy()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt()->>'aal', '') = 'aal2'
     and exists (select 1 from profiles where id = auth.uid() and role::text = 'pharmacy' and account_status = 'active');
$$;

-- The two policies that checked the role inline now use the helper.
drop policy if exists "promo_codes: admin only" on promo_codes;
create policy "promo_codes: admin only" on promo_codes for all using (is_admin()) with check (is_admin());

drop policy if exists audit_log_read on audit_log;
create policy audit_log_read on audit_log for select using (is_admin());

-- ID uploads: images or a PDF, 10 MB each (the form already says so; now the bucket does too).
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
 where id = 'id-verifications';

-- Verify after running (as a staff user with a normal password token, both should be false):
--   select is_admin(), is_clinical();

-- =============================================================================
-- Rate limits shared by every server (the in-memory limiter is per instance).
-- Service role only; the app falls back to in-memory if this isn't there.
-- =============================================================================
create table if not exists rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;
grant all on rate_limits to service_role;

create or replace function rate_hit(p_key text, p_max integer, p_window integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare c integer;
begin
  insert into rate_limits (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window))
  on conflict (key) do update set
    count    = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
    reset_at = case when rate_limits.reset_at < now() then now() + make_interval(secs => p_window) else rate_limits.reset_at end
  returning count into c;
  return c <= p_max;
end $$;
revoke execute on function rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function rate_hit(text, integer, integer) to service_role;

-- Optional housekeeping, any time:
--   delete from rate_limits where reset_at < now() - interval '1 day';

-- =============================================================================
-- Length limits the database enforces too (the app checks them; direct writes
-- with a member's own token must not get around them). NOT VALID: existing
-- rows aren't re-checked, every new write is.
-- =============================================================================
alter table messages drop constraint if exists messages_body_len;
alter table messages add constraint messages_body_len check (char_length(body) <= 4000) not valid;
alter table profiles drop constraint if exists profiles_name_len;
alter table profiles add constraint profiles_name_len check (full_name is null or char_length(full_name) <= 120) not valid;
alter table profiles drop constraint if exists profiles_phone_len;
alter table profiles add constraint profiles_phone_len check (phone is null or char_length(phone) <= 20) not valid;
alter table profiles drop constraint if exists profiles_cart_size;
alter table profiles add constraint profiles_cart_size check (cart is null or pg_column_size(cart) <= 32768) not valid;
