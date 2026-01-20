-- Fix employee site assignment
-- This script will move an employee from head office to their assigned site

-- STEP 1: Find the St Kaths site ID
-- Run this first to get the site ID
SELECT 
  id,
  name,
  area_id,
  company_id
FROM sites
WHERE name ILIKE '%kath%';

-- STEP 2: Find the employee who needs to be moved
-- Replace with the employee's name or email
SELECT 
  id,
  full_name,
  email,
  app_role,
  site_id,
  home_site
FROM profiles
WHERE 
  full_name ILIKE '%[EMPLOYEE_NAME]%'  -- Replace with actual name
  OR email ILIKE '%[EMAIL]%';           -- Or use email

-- STEP 3: Update the employee's site_id
-- Replace EMPLOYEE_ID and SITE_ID with actual values from above queries
/*
UPDATE profiles
SET 
  site_id = 'SITE_ID_HERE',           -- St Kaths site ID
  home_site = 'SITE_ID_HERE'          -- Also update home_site for consistency
WHERE id = 'EMPLOYEE_ID_HERE';
*/

-- STEP 4: Verify the fix
/*
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.app_role,
  p.site_id,
  s.name as site_name,
  '✅ Fixed - Now assigned to site' as status
FROM profiles p
LEFT JOIN sites s ON p.site_id = s.id
WHERE p.id = 'EMPLOYEE_ID_HERE';
*/

-- ALTERNATIVE: If you know the employee name and site name, use this one-liner:
/*
UPDATE profiles
SET 
  site_id = (SELECT id FROM sites WHERE name ILIKE '%kath%' LIMIT 1),
  home_site = (SELECT id FROM sites WHERE name ILIKE '%kath%' LIMIT 1)
WHERE 
  full_name ILIKE '%[EMPLOYEE_NAME]%'
  AND company_id = (SELECT id FROM companies LIMIT 1);
*/

-- Check for common issues:
-- Issue 1: Employee has home_site but no site_id
SELECT 
  p.id,
  p.full_name,
  p.home_site,
  s.name as home_site_name,
  '⚠️ Fix: Copy home_site to site_id' as solution
FROM profiles p
JOIN sites s ON p.home_site = s.id
WHERE 
  p.site_id IS NULL 
  AND p.home_site IS NOT NULL;

-- Fix for Issue 1:
/*
UPDATE profiles
SET site_id = home_site
WHERE site_id IS NULL AND home_site IS NOT NULL;
*/

