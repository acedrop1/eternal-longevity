-- =============================================================================
-- 0023_assessment_drafts — a signed-in member's unfinished assessment.
--
-- Saved as they answer, one row per entry point (a product id, a category key,
-- or 'general' for /start with no parameter), so the portal can offer
-- "Continue your Finasteride visit" and /start resumes on the screen they left.
-- Deleted when that assessment is submitted. Drafts older than 30 days are
-- ignored by the app.
--
-- Written and read only by server actions on the service-role client; the
-- owner policy is there so nothing else can.
--
-- Safe to re-run.
--
-- Verify after running:
--   select count(*) from assessment_drafts;   -- expect 0 (the table exists)
-- =============================================================================

create table if not exists assessment_drafts (
  user_id    uuid not null references profiles(id) on delete cascade,
  entry      text not null,
  answers    jsonb not null default '{}'::jsonb,
  screen     text,
  progress   smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry)
);

alter table assessment_drafts enable row level security;

drop policy if exists "assessment drafts: owner" on assessment_drafts;
create policy "assessment drafts: owner" on assessment_drafts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
