-- Eternal Longevity — migration 0008: abandoned-funnel recovery
--
-- Two things drop out of the funnel silently today:
--
--   1. A member fills a cart and leaves. The cart already persists on the
--      profile (0005) so it survives a device change — but nothing knows
--      *when* it was last touched, so nothing can notice it went cold.
--
--   2. A member finishes signup, is told to complete their visit before a
--      prescriber can review, and never does. That intake sits at
--      'awaiting_visit' forever and nobody is ever nudged. This one is worth
--      more: they already gave an email, a history and an intent.
--
-- Both need the same two facts: when did it go quiet, and have we already
-- said something. Sending once per abandonment is the whole point — a second
-- unsolicited nudge is what turns a reminder into spam.
--
-- Safe to re-run.

alter table profiles
  add column if not exists cart_updated_at  timestamptz,
  add column if not exists cart_reminder_at timestamptz;

comment on column profiles.cart_updated_at is
  'Last time the cart contents actually changed. Set by saveCartAction.';
comment on column profiles.cart_reminder_at is
  'When the abandoned-cart nudge was sent. Cleared whenever the cart changes '
  'again, so a later abandonment can be reminded once more.';

alter table intake_submissions
  add column if not exists reminder_at timestamptz;

comment on column intake_submissions.reminder_at is
  'When the unfinished-visit nudge was sent. Null means never nudged.';

-- The recovery job scans for rows that went quiet before a cutoff and have
-- not been reminded. Partial indexes keep that scan cheap and keep the
-- already-reminded rows out of the index entirely.
create index if not exists profiles_cart_recovery_idx
  on profiles (cart_updated_at)
  where cart_reminder_at is null;

create index if not exists intake_recovery_idx
  on intake_submissions (updated_at)
  where reminder_at is null;
