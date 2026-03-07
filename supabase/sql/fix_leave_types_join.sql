-- Fix leave_types JOIN issue
-- The problem is likely RLS blocking access to leave_types during the JOIN

-- Step 1: Check what leave_type_ids exist in leave_balances
SELECT 
  'leave_type_ids in leave_balances' as test,
  lb.leave_type_id,
  COUNT(*) as count
FROM leave_balances lb
WHERE lb.company_id = public.get_user_company_id_safe()
GROUP BY lb.leave_type_id;

-- Step 2: Check if those leave_types exist
SELECT 
  'leave_types that should exist' as test,
  lt.id,
  lt.name,
  lt.code,
  lt.company_id
FROM leave_types lt
WHERE lt.id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = public.get_user_company_id_safe()
);

-- Step 3: Check if you can access those leave_types via RLS
SELECT 
  'leave_types accessible via RLS' as test,
  COUNT(*) as accessible_count
FROM leave_types lt
WHERE lt.id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = public.get_user_company_id_safe()
);

-- Step 4: Check current leave_types RLS policies
SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leave_types'
ORDER BY policyname;

-- Step 5: Fix leave_types RLS to allow JOIN
-- Drop existing SELECT policies
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;

-- Create a policy that allows access to leave_types
-- Simplified to avoid recursion issues
CREATE POLICY "leave_types_select_company"
ON leave_types FOR SELECT
USING (
  -- Global types (company_id IS NULL)
  company_id IS NULL
  OR
  -- Types in user's company (using EXISTS to avoid recursion)
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_types.company_id
  )
);

-- Step 6: Test the JOIN again
SELECT 
  'Test JOIN after fix' as test,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 7: Test the view
SELECT 
  'Test view after fix' as test,
  COUNT(*) as view_rows
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

