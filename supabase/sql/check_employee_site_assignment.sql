-- Check employee site assignments for St Kaths
-- This will help troubleshoot why an employee is appearing in head office instead of their site

-- First, let's see all sites to find St Kaths
SELECT 
  id,
  name,
  area_id,
  company_id
FROM sites
WHERE name ILIKE '%kath%'
ORDER BY name;

-- Then check employees assigned to St Kaths (or should be)
-- Replace 'YOUR_SITE_ID' with the actual site ID from above query
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.app_role,
  p.site_id,
  p.home_site,
  s.name as site_name,
  CASE 
    WHEN p.site_id IS NULL THEN '❌ NO SITE_ID - Will show in Head Office'
    ELSE '✅ Has site_id - Should show in site'
  END as status
FROM profiles p
LEFT JOIN sites s ON p.site_id = s.id
WHERE 
  p.full_name ILIKE '%[EMPLOYEE_NAME]%'  -- Replace with employee name
  OR p.site_id IN (SELECT id FROM sites WHERE name ILIKE '%kath%')
  OR p.home_site IN (SELECT id FROM sites WHERE name ILIKE '%kath%')
ORDER BY p.full_name;

-- Check if there are any employees with home_site but no site_id
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.app_role,
  p.site_id,
  p.home_site,
  s1.name as site_id_name,
  s2.name as home_site_name,
  '⚠️ MISMATCH: home_site set but site_id is NULL' as issue
FROM profiles p
LEFT JOIN sites s1 ON p.site_id = s1.id
LEFT JOIN sites s2 ON p.home_site = s2.id
WHERE 
  p.home_site IS NOT NULL 
  AND p.site_id IS NULL
  AND p.company_id = (SELECT id FROM companies LIMIT 1)
ORDER BY p.full_name;

