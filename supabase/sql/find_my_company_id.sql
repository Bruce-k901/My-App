-- Find your company_id
-- Run this first to get your company_id, then use it in create_balances_with_company_id.sql

-- Option 1: If you know your email
SELECT 
  p.id as profile_id,
  p.email,
  p.full_name,
  p.company_id,
  'Copy this company_id' as instruction
FROM profiles p
WHERE p.email ILIKE '%your-email%'  -- Replace with your email
LIMIT 1;

-- Option 2: Show all recent profiles (if you can see them)
SELECT 
  p.id as profile_id,
  p.email,
  p.full_name,
  p.company_id,
  p.created_at,
  'Copy the company_id for your profile' as instruction
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;

-- Option 3: Show all companies (if you have access)
SELECT 
  c.id as company_id,
  c.name as company_name,
  COUNT(p.id) as employee_count,
  'Use this company_id' as instruction
FROM companies c
LEFT JOIN profiles p ON p.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.created_at DESC;

