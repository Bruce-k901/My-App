-- Backfill start_date for employees from their accepted offer letters
-- This script will set the start_date on profiles based on the offer_letters they accepted
-- Uses both onboarding_profile_id and candidate_id/email matching for compatibility

UPDATE profiles p
SET start_date = COALESCE(
  -- First try: use onboarding_profile_id (preferred method)
  (
    SELECT ol.start_date
    FROM offer_letters ol
    WHERE ol.status = 'accepted'
      AND ol.onboarding_profile_id = p.id
      AND ol.start_date IS NOT NULL
    ORDER BY ol.accepted_at DESC
    LIMIT 1
  ),
  -- Fallback: match by candidate email
  (
    SELECT ol.start_date
    FROM offer_letters ol
    INNER JOIN candidates c ON c.id = ol.candidate_id
    WHERE ol.status = 'accepted'
      AND LOWER(c.email) = LOWER(p.email)
      AND ol.start_date IS NOT NULL
      AND p.company_id = ol.company_id
    ORDER BY ol.accepted_at DESC
    LIMIT 1
  )
)
WHERE p.start_date IS NULL
  AND (
    -- Has accepted offer with onboarding_profile_id
    EXISTS (
      SELECT 1
      FROM offer_letters ol
      WHERE ol.status = 'accepted'
        AND ol.onboarding_profile_id = p.id
        AND ol.start_date IS NOT NULL
    )
    OR
    -- Has accepted offer matching email and company
    EXISTS (
      SELECT 1
      FROM offer_letters ol
      INNER JOIN candidates c ON c.id = ol.candidate_id
      WHERE ol.status = 'accepted'
        AND LOWER(c.email) = LOWER(p.email)
        AND ol.start_date IS NOT NULL
        AND p.company_id = ol.company_id
    )
  );

-- Verify the backfill worked
SELECT 
  COUNT(*) as total_profiles,
  COUNT(start_date) as profiles_with_start_date,
  COUNT(*) - COUNT(start_date) as profiles_without_start_date
FROM profiles
WHERE company_id IS NOT NULL;

-- Show profiles that were updated
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.start_date,
  ol.start_date as offer_start_date,
  ol.status as offer_status,
  ol.accepted_at
FROM profiles p
INNER JOIN offer_letters ol ON ol.onboarding_profile_id = p.id
WHERE ol.status = 'accepted'
  AND ol.start_date IS NOT NULL
ORDER BY ol.accepted_at DESC
LIMIT 20;


