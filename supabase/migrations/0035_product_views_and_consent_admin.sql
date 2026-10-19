-- =============================================================================
-- 0035: first-party product page views for Admin → Marketing (kind 'product').
-- Anonymous like every site_events row: no person, never sent to ad platforms.
-- =============================================================================
alter table site_events drop constraint if exists site_events_kind_check;
alter table site_events add constraint site_events_kind_check
  check (kind in ('visit', 'start', 'step', 'complete', 'product'));
