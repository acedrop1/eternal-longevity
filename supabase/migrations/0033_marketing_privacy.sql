-- =============================================================================
-- 0033_marketing_privacy — the optional marketing program and privacy requests.
--
-- marketing_contacts        one row per person who used /subscribe. Email and
--                           SMS consent are separate; neither is 'subscribed'
--                           until confirmed (email link, SMS reply YES).
-- marketing_consent_events  the consent ledger: every opt-in, confirmation and
--                           opt-out, with the disclosure text and version shown.
--                           Never delete rows: it is the suppression evidence.
-- privacy_requests          /privacy-request submissions, due in 45 days.
--
-- No health data in any of these. Service role only. Safe to re-run.
--
-- Verify after running:
--   select count(*) from marketing_contacts;          -- 0 or more, no error
--   select relrowsecurity from pg_class where relname in
--     ('marketing_contacts', 'marketing_consent_events', 'privacy_requests'); -- all true
-- =============================================================================

create table if not exists marketing_contacts (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  phone         text,
  first_name    text,
  state         text,
  email_status  text not null default 'none'
                  check (email_status in ('none', 'pending', 'subscribed', 'unsubscribed')),
  sms_status    text not null default 'none'
                  check (sms_status in ('none', 'pending', 'subscribed', 'unsubscribed')),
  -- Two v4 UUIDs, dashes stripped: 64 hex chars (same as leads.unsubscribe_token).
  -- email_token is rotated by the app on every fresh opt-in.
  email_token   text unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  pref_token    text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  timezone      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists marketing_contacts_phone_idx on marketing_contacts (phone);

drop trigger if exists marketing_contacts_updated_at on marketing_contacts;
create trigger marketing_contacts_updated_at before update on marketing_contacts
  for each row execute function set_updated_at();

create table if not exists marketing_consent_events (
  id                  bigint generated always as identity primary key,
  contact_id          uuid not null references marketing_contacts (id),
  channel             text not null check (channel in ('email', 'sms')),
  action              text not null check (action in ('opt_in', 'confirm', 'opt_out')),
  disclosure_text     text,
  disclosure_version  text,
  form_url            text,
  ip                  text,
  user_agent          text,
  created_at          timestamptz not null default now()
);

create index if not exists marketing_consent_events_contact_idx
  on marketing_consent_events (contact_id, created_at desc);

create table if not exists privacy_requests (
  id                uuid primary key default gen_random_uuid(),
  ref               text not null unique
                      default 'PR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  request_type      text not null check (request_type in
                      ('access', 'correction', 'deletion', 'copy', 'consent_withdrawal', 'ad_opt_out', 'appeal', 'agent')),
  name              text not null,
  email             text not null,
  state             text,
  details           text check (char_length(details) <= 2000),
  is_agent          boolean not null default false,
  agent_name        text,
  status            text not null default 'received' check (status in
                      ('received', 'in_progress', 'extended', 'completed', 'denied', 'appealed')),
  due_at            timestamptz not null default now() + interval '45 days',
  extended_until    timestamptz,
  extension_reason  text,
  appeal_of         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists privacy_requests_created_idx on privacy_requests (created_at desc);

drop trigger if exists privacy_requests_updated_at on privacy_requests;
create trigger privacy_requests_updated_at before update on privacy_requests
  for each row execute function set_updated_at();

alter table marketing_contacts enable row level security;
alter table marketing_consent_events enable row level security;
alter table privacy_requests enable row level security;
revoke all on marketing_contacts, marketing_consent_events, privacy_requests from anon, authenticated;
grant all on marketing_contacts, marketing_consent_events, privacy_requests to service_role;
