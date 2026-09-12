-- =============================================================================
-- 0013_staff_mfa — a second factor for accounts that can reach other people's
-- records.
--
-- A password alone is one leak away from every patient chart in the system.
-- Members keep a single factor; doctor, admin and pharmacy accounts get a code
-- emailed on each new sign-in.
--
-- Codes are stored hashed. A row is single-use and short-lived, and the attempt
-- counter is what stops someone walking a six-digit space.
-- =============================================================================

create table if not exists mfa_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mfa_codes_user_idx on mfa_codes(user_id, created_at desc);

alter table mfa_codes enable row level security;
-- No policy on purpose: only the service role touches this table.
