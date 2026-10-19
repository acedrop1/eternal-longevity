-- =============================================================================
-- 0034: consent banner choices (Accept all / Reject optional / Manage), with the
-- banner version and GPC flag. Keyed by a random browser id; service role only.
-- =============================================================================
create table if not exists consent_log (
  id bigint generated always as identity primary key,
  browser_id uuid not null,
  analytics boolean not null default false,
  advertising boolean not null default false,
  gpc boolean not null default false,
  version text not null,
  created_at timestamptz not null default now()
);
create index if not exists consent_log_browser_idx on consent_log (browser_id, created_at desc);
alter table consent_log enable row level security;
revoke all on consent_log from anon, authenticated;
grant all on consent_log to service_role;
