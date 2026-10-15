-- =============================================================================
-- 0031_message_log — a record of every email and text the site sends.
--
-- Written by sendEmail / sendSms (lib/message-log.ts) after each attempt,
-- sent or failed. Admin reads it on a member's page and on an order. Bodies
-- are kept as plain text with links removed, so a password-reset or sign-in
-- link is never stored; 6-digit codes in texts are masked.
--
-- Service role only. Safe to re-run.
--
-- Verify after running:
--   select count(*) from message_log;                 -- 0 or more, no error
--   select relrowsecurity from pg_class where relname = 'message_log'; -- true
-- =============================================================================

create table if not exists message_log (
  id           bigint generated always as identity primary key,
  channel      text not null check (channel in ('email', 'sms')),
  recipient    text not null,
  subject      text,
  body         text,
  status       text not null check (status in ('sent', 'failed')),
  error        text,
  provider_id  text,
  created_at   timestamptz not null default now()
);

create index if not exists message_log_recipient_idx on message_log (recipient, created_at desc);

alter table message_log enable row level security;
revoke all on message_log from anon, authenticated;
