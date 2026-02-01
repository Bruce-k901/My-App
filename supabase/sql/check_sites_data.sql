-- Check sites data
SELECT 
  id,
  name,
  company_id,
  is_active,
  created_at,
  updated_at
FROM sites
ORDER BY created_at DESC
LIMIT 50;

-- Count sites by company
SELECT 
  company_id,
  COUNT(*) as site_count
FROM sites
GROUP BY company_id
ORDER BY site_count DESC;

-- Check if sites table exists and has data
SELECT 
  COUNT(*) as total_sites,
  COUNT(DISTINCT company_id) as companies_with_sites
FROM sites;

