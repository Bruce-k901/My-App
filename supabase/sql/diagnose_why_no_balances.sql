-- Diagnostic: Why aren't balances being created?
-- Run this to see what's happening

-- Step 1: Check your auth and profile
SELECT 
  auth.uid() as current_auth_uid,
  'Check auth.uid()' as step;

-- Step 2: Check your profile
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id,
  p.annual_leave_allowance,
  CASE 
    WHEN p.id = auth.uid() THEN '✅ id matches'
    WHEN p.auth_user_id = auth.uid() THEN '✅ auth_user_id matches'
    ELSE '❌ NO MATCH'
  END as match_status
FROM profiles p
WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid();

-- Step 3: Check if there are other employees in your company
SELECT 
  COUNT(*) as total_profiles_in_company,
  string_agg(p.email || ' (' || COALESCE(p.full_name, 'no name') || ')', ', ') as employee_list
FROM profiles p
WHERE p.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
);

-- Step 4: Check if leave_types exist
SELECT 
  COUNT(*) as total_leave_types,
  string_agg(lt.name || ' (' || lt.code || ')', ', ') as leave_type_list
FROM leave_types lt
WHERE lt.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
);

-- Step 5: Check existing balances
SELECT 
  COUNT(*) as existing_balances_count,
  COUNT(DISTINCT profile_id) as employees_with_balances
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
);

-- Step 6: Try to see all profiles (check RLS)
SELECT 
  COUNT(*) as accessible_profiles_via_rls,
  COUNT(DISTINCT company_id) as unique_companies
FROM profiles;

-- Step 7: Try to see all leave_types (check RLS)
SELECT 
  COUNT(*) as accessible_leave_types_via_rls
FROM leave_types;

-- Step 8: Detailed employee list with company_id
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.annual_leave_allowance,
  COUNT(lb.id) as existing_balances
FROM profiles p
LEFT JOIN leave_balances lb ON lb.profile_id = p.id AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE p.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
GROUP BY p.id, p.email, p.full_name, p.company_id, p.annual_leave_allowance
ORDER BY p.full_name;

