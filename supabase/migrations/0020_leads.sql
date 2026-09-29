-- =============================================================================
-- 0020_leads — assessment leads and the follow-up emails that chase them.
--
-- leads: an email given at the assessment's email step, before any account
-- exists, with the consent shown at the time. Written only by the server
-- (service role) through captureLeadAction. converted_at is set once an
-- account exists on that address; unsubscribed_at is set from the emailed
-- /unsubscribe/<token> link and never cleared by a later capture.
--
-- email_sends: one row per follow-up email, written BEFORE the send. The
-- unique (stage, ref, step) is the idempotency guard — a retried or
-- overlapping cron run cannot send the same step twice — and the
-- (email, sent_at) index backs the one-email-per-person-per-day cap across
-- every stage.
--
-- profiles.unsubscribe_token: the same one-click opt-out for members (the
-- "your plan is ready" reminders). Staff-only under the 0018 guard, so a
-- member cannot rewrite it. Opting out sets notification_prefs.reminders and
-- .marketing to false.
--
-- Safe to re-run.
--
-- Verify after running:
--   select count(*) from leads;                                  -- 0 or more, no error
--   select count(*) from email_sends;                            -- 0 or more, no error
--   select count(*) from profiles where unsubscribe_token is null; -- expect 0
--   select relname, relrowsecurity from pg_class
--   where relname in ('leads', 'email_sends');                   -- expect both true
-- =============================================================================

create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique
                       check (char_length(email) <= 254 and email = lower(email)),
  product_id         text,
  category           text,
  consent_at         timestamptz not null,
  consent_text       text not null,
  created_at         timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  converted_at       timestamptz,
  unsubscribed_at    timestamptz,
  emails_sent        int not null default 0,
  last_email_at      timestamptz,
  -- Two v4 UUIDs, dashes stripped: 64 hex chars, 244 random bits.
  unsubscribe_token  text not null unique
                       default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);

-- The follow-up job scans only leads still worth mailing.
create index if not exists leads_followup_idx
  on leads (last_seen_at)
  where converted_at is null and unsubscribed_at is null;

alter table leads enable row level security;
revoke all on leads from anon, authenticated;

create table if not exists email_sends (
  id       bigint generated always as identity primary key,
  email    text not null,
  stage    text not null,
  ref      text not null,
  step     smallint not null,
  sent_at  timestamptz not null default now(),
  unique (stage, ref, step)
);

create index if not exists email_sends_email_sent_idx on email_sends (email, sent_at desc);

alter table email_sends enable row level security;
revoke all on email_sends from anon, authenticated;

alter table profiles
  add column if not exists unsubscribe_token text unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

comment on column profiles.unsubscribe_token is
  'Credential for /unsubscribe/<token> in member reminder emails. Server-written only.';
