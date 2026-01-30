-- FINAL FIX: Ensure view works by checking all RLS policies
-- Views inherit RLS from underlying tables, but we need to ensure all policies are correct

-- Step 1: Verify helper functions work
SELECT 
  'Testing helper functions' as step,
  public.get_user_company_id_safe() as company_id,
  public.is_user_manager_or_above() as is_manager;

-- Step 2: Check if profiles RLS allows company access
-- This is CRITICAL - if profiles RLS blocks, the view JOIN fails
SELECT 
  'Testing profiles access' as step,
  COUNT(*) as accessible_profiles
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 3: Check if leave_balances RLS allows company access
SELECT 
  'Testing leave_balances access' as step,
  COUNT(*) as accessible_balances
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe();

-- Step 4: Check if leave_types RLS allows access
SELECT 
  'Testing leave_types access' as step,
  COUNT(*) as accessible_types
FROM leave_types
WHERE company_id = public.get_user_company_id_safe()
   OR company_id IS NULL;

-- Step 5: Test the view directly
SELECT 
  'Testing view access' as step,
  COUNT(*) as view_rows
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 6: If view returns 0 but tables have data, the JOIN is being blocked
-- Let's check the actual JOIN manually
SELECT 
  'Manual JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 7: Show what RLS policies exist
SELECT 
  tablename,
  policyname,
  cmd as command_type,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as has_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('leave_balances', 'profiles', 'leave_types')
ORDER BY tablename, policyname;

