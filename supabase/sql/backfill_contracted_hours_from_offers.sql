-- Backfill contracted_hours_per_week for employees from their accepted offer letters
-- This script will set the contracted_hours_per_week on profiles based on the offer_letters they accepted
-- Uses both onboarding_profile_id and candidate_id/email matching for compatibility
-- IMPORTANT: This updates ALL profiles to match their accepted offer, even if they already have a value

UPDATE profiles p
SET contracted_hours_per_week = COALESCE(
  -- First try: use onboarding_profile_id (preferred method)
  (
    SELECT ol.contract_hours
    FROM offer_letters ol
    WHERE ol.status = 'accepted'
      AND ol.onboarding_profile_id = p.id
      AND ol.contract_hours IS NOT NULL
      AND ol.contract_hours > 0
    ORDER BY ol.accepted_at DESC
    LIMIT 1
  ),
  -- Fallback: match by candidate email
  (
    SELECT ol.contract_hours
    FROM offer_letters ol
    INNER JOIN candidates c ON c.id = ol.candidate_id
    WHERE ol.status = 'accepted'
      AND LOWER(c.email) = LOWER(p.email)
      AND ol.contract_hours IS NOT NULL
      AND ol.contract_hours > 0
      AND p.company_id = ol.company_id
    ORDER BY ol.accepted_at DESC
    LIMIT 1
  )
)
WHERE (
    -- Has accepted offer with onboarding_profile_id
    EXISTS (
      SELECT 1
      FROM offer_letters ol
      WHERE ol.status = 'accepted'
        AND ol.onboarding_profile_id = p.id
        AND ol.contract_hours IS NOT NULL
        AND ol.contract_hours > 0
    )
    OR
    -- Has accepted offer matching email and company
    EXISTS (
      SELECT 1
      FROM offer_letters ol
      INNER JOIN candidates c ON c.id = ol.candidate_id
      WHERE ol.status = 'accepted'
        AND LOWER(c.email) = LOWER(p.email)
        AND ol.contract_hours IS NOT NULL
        AND ol.contract_hours > 0
        AND p.company_id = ol.company_id
    )
  );

-- Verify the backfill worked
SELECT 
  COUNT(*) as total_profiles,
  COUNT(contracted_hours_per_week) as profiles_with_contracted_hours,
  COUNT(*) - COUNT(contracted_hours_per_week) as profiles_without_contracted_hours
FROM profiles
WHERE company_id IS NOT NULL;

-- Show profiles that were updated
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.contracted_hours_per_week,
  ol.contract_hours as offer_contract_hours,
  ol.status as offer_status,
  ol.accepted_at
FROM profiles p
INNER JOIN offer_letters ol ON ol.onboarding_profile_id = p.id
WHERE ol.status = 'accepted'
  AND ol.contract_hours IS NOT NULL
  AND ol.contract_hours > 0
ORDER BY ol.accepted_at DESC
LIMIT 20;


