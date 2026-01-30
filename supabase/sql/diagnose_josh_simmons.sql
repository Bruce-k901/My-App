-- Diagnostic query for Josh Simmons
-- This will show us exactly what's in the database

-- 1. Check Josh's profile data
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.app_role,
  p.site_id,
  p.home_site,
  p.status,
  s1.name as site_id_name,
  s2.name as home_site_name,
  CASE 
    WHEN p.site_id IS NULL THEN '❌ NO site_id - This is why he shows in Head Office!'
    ELSE '✅ Has site_id: ' || s1.name
  END as site_id_status,
  CASE 
    WHEN p.status = 'onboarding' THEN '❌ Status is "onboarding" - This is why badge shows!'
    WHEN p.status = 'active' THEN '✅ Status is active'
    WHEN p.status IS NULL THEN '⚠️ Status is NULL - should be "active"'
    ELSE '⚠️ Status is: ' || p.status
  END as status_check
FROM profiles p
LEFT JOIN sites s1 ON p.site_id = s1.id
LEFT JOIN sites s2 ON p.home_site = s2.id
WHERE 
  p.full_name ILIKE '%josh%simmons%'
  OR p.full_name ILIKE '%simmons%josh%';

-- 2. Find St Kaths site ID (for reference)
SELECT 
  id as st_kaths_site_id,
  name,
  area_id,
  company_id
FROM sites
WHERE name ILIKE '%kath%';

-- 3. Check if there are any other Josh/Simmons in the system
SELECT 
  id,
  full_name,
  email,
  site_id,
  status
FROM profiles
WHERE 
  full_name ILIKE '%josh%'
  OR full_name ILIKE '%simmons%'
ORDER BY full_name;

