-- =============================================================================
-- 0017_waitlist — emails collected on the pre-launch page (/coming-soon).
--
-- Written only by the server (service role). No member or staff policy: the
-- list is read in the Supabase dashboard or by an admin tool later.
--
-- Safe to re-run.
-- =============================================================================

create table if not exists waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (char_length(email) <= 254),
  source      text not null default 'coming-soon',
  created_at  timestamptz not null default now()
);

alter table waitlist enable row level security;
revoke all on waitlist from anon, authenticated;
