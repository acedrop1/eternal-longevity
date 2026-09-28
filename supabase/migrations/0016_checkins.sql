-- =============================================================================
-- 0016_checkins — the 30-day "how's it going?" check-in.
--
-- One row per check-in, created by the daily cron (/api/cron/checkins) thirty
-- days after a member's first delivery of a product, and again after their
-- first refill of it. Nothing else gets one.
--
-- order_id is unique: an order is checked in on at most once, ever, however
-- many times the cron runs or retries. The row is written before the email is
-- sent, so a crash between the two can never produce a second email.
--
-- token is the credential for the emailed link (32 random bytes, base64url,
-- minted by the app like the pay link). The member answers without signing in;
-- the answer is written once, through the service role, and the token is then
-- spent (responded_at is set and never cleared).
--
-- Safe to re-run.
-- =============================================================================

create table if not exists checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  order_id      uuid not null unique references orders(id) on delete cascade,
  product_id    text not null,
  product_name  text not null,
  kind          text not null check (kind in ('first', 'refill')),
  token         text not null unique,
  sent_at       timestamptz,
  rating        smallint check (rating between 1 and 5),
  comment       text check (char_length(comment) <= 2000),
  responded_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists checkins_user_id_idx on checkins(user_id);
create index if not exists checkins_created_at_idx on checkins(created_at desc);

alter table checkins enable row level security;

-- Members read their own; clinical staff (doctor, admin) read all.
drop policy if exists "checkins: read own or clinical" on checkins;
create policy "checkins: read own or clinical"
  on checkins for select using (user_id = auth.uid() or is_clinical());

-- A member answers their own, once, and can touch only the answer columns.
-- The app writes answers through the service role (the emailed link has no
-- session), so this only matters for a signed-in client talking to Supabase
-- directly.
revoke update on checkins from anon, authenticated;
grant update (rating, comment, responded_at) on checkins to authenticated;

drop policy if exists "checkins: member answers own" on checkins;
create policy "checkins: member answers own"
  on checkins for update
  using (user_id = auth.uid() and responded_at is null)
  with check (user_id = auth.uid());

-- No insert or delete policies: rows are created by the cron (service role)
-- and never removed from inside the app.
