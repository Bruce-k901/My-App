-- Comprehensive diagnostic - run this and share ALL results
-- This will show exactly where the problem is

-- Test 1: Do leave_balances exist?
SELECT 'Test 1: leave_balances exist?' as test, COUNT(*) as count 
FROM leave_balances 
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Test 2: Can we see profiles?
SELECT 'Test 2: Can see profiles?' as test, COUNT(*) as count 
FROM profiles 
WHERE company_id = public.get_user_company_id_safe();

-- Test 3: Can we see leave_types?
SELECT 'Test 3: Can see leave_types?' as test, COUNT(*) as count 
FROM leave_types 
WHERE company_id = public.get_user_company_id_safe() OR company_id IS NULL;

-- Test 4: What leave_type_ids are in balances?
SELECT 'Test 4: leave_type_ids in balances' as test, 
  string_agg(DISTINCT leave_type_id::text, ', ') as leave_type_ids
FROM leave_balances 
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Test 5: Can we see those specific leave_types?
SELECT 'Test 5: Can see those leave_types?' as test, COUNT(*) as count
FROM leave_types
WHERE id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = public.get_user_company_id_safe()
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Test 6: Test profiles JOIN
SELECT 'Test 6: profiles JOIN' as test, COUNT(*) as count
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Test 7: Test leave_types JOIN
SELECT 'Test 7: leave_types JOIN' as test, COUNT(*) as count
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Test 8: Test full JOIN (all three tables)
SELECT 'Test 8: Full JOIN' as test, COUNT(*) as count
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Test 9: Test view without year filter
SELECT 'Test 9: View without year filter' as test, COUNT(*) as count
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe();

-- Test 10: Test view with year filter
SELECT 'Test 10: View with year filter' as test, COUNT(*) as count
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Test 11: Show sample from view (if any)
SELECT 'Test 11: Sample from view' as test, 
  profile_id, 
  full_name, 
  leave_type_name,
  year,
  entitled_days
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
LIMIT 3;

