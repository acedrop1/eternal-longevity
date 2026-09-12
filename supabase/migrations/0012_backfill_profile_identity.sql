-- =============================================================================
-- 0012_backfill_profile_identity — lift name, phone and date of birth out of
-- the intake answers and onto the profile row.
--
-- These were only ever written into intake_submissions.answers, so the member
-- record showed "—" for a date of birth the intake right beside it had. Every
-- later read — the admin page, an age check, the record sent to the pharmacy —
-- looked at the profile and found nothing.
--
-- Safe to re-run: only fills columns that are currently empty, and only from
-- the member's most recent intake.
-- =============================================================================

with latest as (
  select distinct on (user_id)
    user_id,
    answers
  from intake_submissions
  where user_id is not null
  order by user_id, created_at desc
)
update profiles p
set
  date_of_birth = coalesce(
    p.date_of_birth,
    nullif(latest.answers->>'dob', '')::date
  ),
  phone = coalesce(nullif(p.phone, ''), nullif(latest.answers->>'phone', '')),
  full_name = coalesce(
    nullif(p.full_name, ''),
    nullif(
      trim(
        coalesce(latest.answers->>'first_name', '') || ' ' ||
        coalesce(latest.answers->>'last_name', '')
      ),
      ''
    )
  )
from latest
where latest.user_id = p.id
  and (
    p.date_of_birth is null
    or coalesce(p.phone, '') = ''
    or coalesce(p.full_name, '') = ''
  )
  and (latest.answers->>'dob') ~ '^\d{4}-\d{2}-\d{2}$';
