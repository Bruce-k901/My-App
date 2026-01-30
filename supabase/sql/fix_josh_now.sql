-- IMMEDIATE FIX FOR JOSH SIMMONS
-- Based on the data you provided: site_id is null, status is onboarding

-- Step 1: Get St Kaths site ID
SELECT id, name FROM sites WHERE name ILIKE '%kath%';

-- Step 2: Fix Josh - set site and activate
-- Replace [ST_KATHS_SITE_ID] with the ID from Step 1

UPDATE profiles
SET 
  site_id = '[ST_KATHS_SITE_ID]',
  home_site = '[ST_KATHS_SITE_ID]',
  status = 'active'
WHERE 
  id = '593d7c4f-d0e5-416f-ad23-eb278bb0cd17';

-- Step 3: Verify
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.site_id,
  p.home_site,
  p.status,
  s.name as site_name,
  '✅ Josh is now active at St Kaths!' as result
FROM profiles p
LEFT JOIN sites s ON p.site_id = s.id
WHERE p.id = '593d7c4f-d0e5-416f-ad23-eb278bb0cd17';


-- ALTERNATIVE: One-liner if St Kaths name is exact
/*
UPDATE profiles
SET 
  site_id = (SELECT id FROM sites WHERE name ILIKE '%kath%' LIMIT 1),
  home_site = (SELECT id FROM sites WHERE name ILIKE '%kath%' LIMIT 1),
  status = 'active'
WHERE 
  id = '593d7c4f-d0e5-416f-ad23-eb278bb0cd17';
*/

