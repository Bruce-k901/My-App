-- Simple direct test - run this and share ALL results
-- This will show exactly what's accessible

-- Test 1: Can you see leave_balances?
SELECT 'Test 1: leave_balances' as test, COUNT(*) as count FROM leave_balances WHERE company_id = public.get_user_company_id_safe();

-- Test 2: Can you see profiles?
SELECT 'Test 2: profiles' as test, COUNT(*) as count FROM profiles WHERE company_id = public.get_user_company_id_safe();

-- Test 3: Can you see leave_types?
SELECT 'Test 3: leave_types' as test, COUNT(*) as count FROM leave_types WHERE company_id = public.get_user_company_id_safe() OR company_id IS NULL;

-- Test 4: Manual JOIN test - profiles
SELECT 'Test 4: leave_balances JOIN profiles' as test, COUNT(*) as count 
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe();

-- Test 5: Manual JOIN test - leave_types
SELECT 'Test 5: leave_balances JOIN leave_types' as test, COUNT(*) as count 
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe();

-- Test 6: Full manual JOIN
SELECT 'Test 6: Full JOIN' as test, COUNT(*) as count 
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe();

-- Test 7: Show what leave_type_ids exist
SELECT 'Test 7: leave_type_ids in balances' as test, leave_type_id, COUNT(*) as count 
FROM leave_balances 
WHERE company_id = public.get_user_company_id_safe()
GROUP BY leave_type_id;

-- Test 8: Can you see those specific leave_types?
SELECT 'Test 8: Can see those leave_types?' as test, COUNT(*) as count
FROM leave_types
WHERE id IN (
  SELECT DISTINCT leave_type_id FROM leave_balances WHERE company_id = public.get_user_company_id_safe()
);

