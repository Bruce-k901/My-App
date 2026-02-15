-- Check home_site status for all employees
SELECT 
  id,
  full_name,
  email,
  home_site,
  company_id,
  created_at,
  updated_at
FROM profiles
WHERE company_id IS NOT NULL
ORDER BY updated_at DESC NULLS LAST
LIMIT 50;

-- Count employees with/without home_site
SELECT 
  COUNT(*) FILTER (WHERE home_site IS NOT NULL) as with_home_site,
  COUNT(*) FILTER (WHERE home_site IS NULL) as without_home_site,
  COUNT(*) as total
FROM profiles
WHERE company_id IS NOT NULL;

-- Check recent updates to home_site (if you have audit logging)
-- This would help identify when/why home_sites were cleared

