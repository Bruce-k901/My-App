-- SIMPLE FIX: Allow access to leave_types used in leave_balances
-- This bypasses complex RLS and directly allows access

-- Step 1: Show what leave_type_ids are in balances
SELECT 
  'leave_type_ids in balances' as step,
  lb.leave_type_id,
  COUNT(*) as count
FROM leave_balances lb
WHERE lb.company_id = public.get_user_company_id_safe()
GROUP BY lb.leave_type_id;

-- Step 2: Show what company_id those leave_types have
-- This will help us understand the issue
SELECT 
  'leave_types details' as step,
  lt.id,
  lt.name,
  lt.code,
  lt.company_id,
  public.get_user_company_id_safe() as your_company_id,
  CASE 
    WHEN lt.company_id IS NULL THEN 'Global'
    WHEN lt.company_id = public.get_user_company_id_safe() THEN 'Your company'
    ELSE 'Different company'
  END as match_status
FROM leave_types lt
WHERE lt.id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = public.get_user_company_id_safe()
);

-- Step 3: Fix leave_types RLS - SIMPLE VERSION
-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;

-- Create a simple policy that allows:
-- 1. Global types (company_id IS NULL)
-- 2. Types in user's company
-- 3. Types used in leave_balances (for JOIN)
CREATE POLICY "leave_types_select_company"
ON leave_types FOR SELECT
USING (
  -- Global types
  company_id IS NULL
  OR
  -- Types in user's company
  company_id = (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() OR auth_user_id = auth.uid() 
    LIMIT 1
  )
  OR
  -- Types used in leave_balances for user's company
  id IN (
    SELECT DISTINCT lb.leave_type_id
    FROM leave_balances lb
    JOIN profiles p ON p.company_id = lb.company_id
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND lb.company_id IS NOT NULL
  )
);

-- Step 4: Test if we can see those leave_types
SELECT 
  'Can see leave_types now?' as step,
  COUNT(*) as accessible_count
FROM leave_types
WHERE id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = public.get_user_company_id_safe()
);

-- Step 5: Test the JOIN
SELECT 
  'JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe();

-- Step 6: Test full JOIN
SELECT 
  'Full JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 7: Test the view
SELECT 
  'View test' as step,
  COUNT(*) as view_rows
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

