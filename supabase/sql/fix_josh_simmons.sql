-- Fix Josh Simmons - Two issues to resolve:
-- 1. Make sure site_id is set (not just home_site)
-- 2. Change status from 'onboarding' to 'active'

-- STEP 1: Run diagnostic first (from diagnose_josh_simmons.sql)
-- This will show you the current state

-- STEP 2: Get St Kaths site ID
SELECT id, name FROM sites WHERE name ILIKE '%kath%';
-- Copy the ID from the result

-- STEP 3: Fix Josh's profile
-- Replace [ST_KATHS_SITE_ID] with the actual ID from Step 2

UPDATE profiles
SET 
  site_id = '[ST_KATHS_SITE_ID]',      -- This fixes the org chart issue
  home_site = '[ST_KATHS_SITE_ID]',    -- Keep both in sync
  status = 'active'                     -- This removes the onboarding badge
WHERE 
  full_name ILIKE '%josh%simmons%'
  OR full_name ILIKE '%simmons%josh%';

-- STEP 4: Verify the fix
SELECT 
  p.full_name,
  p.email,
  p.site_id,
  s.name as site_name,
  p.status,
  CASE 
    WHEN p.site_id IS NOT NULL AND p.status = 'active' 
    THEN '✅ FIXED! Should now appear under St Kaths with no badge'
    ELSE '❌ Still has issues'
  END as verification
FROM profiles p
LEFT JOIN sites s ON p.site_id = s.id
WHERE 
  p.full_name ILIKE '%josh%simmons%'
  OR p.full_name ILIKE '%simmons%josh%';


-- ALTERNATIVE: One-liner fix (if you're confident about the site name)
/*
UPDATE profiles
SET 
  site_id = (SELECT id FROM sites WHERE name ILIKE '%kath%' LIMIT 1),
  home_site = (SELECT id FROM sites WHERE name ILIKE '%kath%' LIMIT 1),
  status = 'active'
WHERE 
  full_name ILIKE '%josh%simmons%';
*/


-- COMMON ISSUE: If home_site is set but site_id is NULL
-- This happens when the employee modal saves to home_site but not site_id
-- Quick fix:
/*
UPDATE profiles
SET 
  site_id = home_site,
  status = 'active'
WHERE 
  full_name ILIKE '%josh%simmons%'
  AND site_id IS NULL 
  AND home_site IS NOT NULL;
*/

