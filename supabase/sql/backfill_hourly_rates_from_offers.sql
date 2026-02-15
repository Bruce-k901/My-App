-- Backfill hourly_rate for employees from their accepted offer letters
-- This script will set the hourly_rate on profiles based on the offer_letters they accepted
-- Only updates if pay_frequency is 'hourly'
-- Note: hourly_rate is stored in pence, pay_rate is in pounds (multiply by 100)

UPDATE profiles p
SET hourly_rate = (
  SELECT ROUND(ol.pay_rate * 100)::INTEGER -- Convert pounds to pence
  FROM offer_letters ol
  WHERE ol.status = 'accepted'
    AND ol.onboarding_profile_id = p.id
    AND ol.pay_frequency = 'hourly'
    AND ol.pay_rate IS NOT NULL
    AND ol.pay_rate > 0
  ORDER BY ol.accepted_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM offer_letters ol
  WHERE ol.status = 'accepted'
    AND ol.onboarding_profile_id = p.id
    AND ol.pay_frequency = 'hourly'
    AND ol.pay_rate IS NOT NULL
    AND ol.pay_rate > 0
)
  AND (
    -- Only update if current hourly_rate is NULL, 0, or different from offer
    p.hourly_rate IS NULL 
    OR p.hourly_rate = 0
    OR p.hourly_rate != (
      SELECT ROUND(ol.pay_rate * 100)::INTEGER
      FROM offer_letters ol
      WHERE ol.status = 'accepted'
        AND ol.onboarding_profile_id = p.id
        AND ol.pay_frequency = 'hourly'
        AND ol.pay_rate IS NOT NULL
        AND ol.pay_rate > 0
      ORDER BY ol.accepted_at DESC
      LIMIT 1
    )
  );

-- Verify the backfill worked
SELECT 
  COUNT(*) as total_profiles_with_hourly_offers,
  COUNT(hourly_rate) as profiles_with_hourly_rate,
  COUNT(*) - COUNT(hourly_rate) as profiles_without_hourly_rate
FROM profiles p
WHERE EXISTS (
  SELECT 1
  FROM offer_letters ol
  WHERE ol.status = 'accepted'
    AND ol.onboarding_profile_id = p.id
    AND ol.pay_frequency = 'hourly'
    AND ol.pay_rate IS NOT NULL
    AND ol.pay_rate > 0
);

-- Show profiles that were updated (with rate in pounds for readability)
SELECT 
  p.id,
  p.full_name,
  p.email,
  ROUND(p.hourly_rate / 100.0, 2) as hourly_rate_pounds,
  ol.pay_rate as offer_pay_rate_pounds,
  ol.pay_frequency,
  ol.status as offer_status,
  ol.accepted_at
FROM profiles p
INNER JOIN offer_letters ol ON ol.onboarding_profile_id = p.id
WHERE ol.status = 'accepted'
  AND ol.pay_frequency = 'hourly'
  AND ol.pay_rate IS NOT NULL
  AND ol.pay_rate > 0
ORDER BY ol.accepted_at DESC
LIMIT 20;


