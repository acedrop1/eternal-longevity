-- =============================================================================
-- 0029 — Marketing attribution: anonymous site events for Admin → Marketing.
--
-- One row per event, no person in it: no user id, email, IP or user agent.
--   visit     a browser session's first page (where it landed, what link)
--   start     the assessment opened
--   step      an assessment screen reached (step = screen key)
--   complete  an assessment submitted
-- Paid orders are counted from `orders`, matched to the source saved on the
-- member's intake (answers._attribution). RLS on, no policies: only the
-- service-role API route writes and only admin pages read.
-- =============================================================================
create table if not exists site_events (
  id          bigserial primary key,
  day         date not null,
  kind        text not null check (kind in ('visit', 'start', 'step', 'complete')),
  path        text,
  source      text,
  medium      text,
  campaign    text,
  step        text,
  created_at  timestamptz not null default now()
);
create index if not exists site_events_day_idx on site_events(day);
alter table site_events enable row level security;
