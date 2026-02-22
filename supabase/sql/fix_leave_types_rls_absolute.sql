-- ABSOLUTE FIX: Make leave_types accessible for JOIN
-- This fixes the root cause - RLS blocking access to leave_types used in balances

-- Step 1: Show what leave_type_ids are in balances
SELECT 
  'leave_type_ids in balances' as step,
  string_agg(DISTINCT leave_type_id::TEXT, ', ') as leave_type_ids
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 2: Drop ALL existing leave_types SELECT policies
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;
DROP POLICY IF EXISTS "manage_leave_types" ON leave_types;

-- Step 3: Create a SIMPLE, PERMISSIVE policy that allows access
-- This policy allows:
-- 1. Global types (company_id IS NULL)
-- 2. Types in user's company
-- 3. Types used in leave_balances for user's company (CRITICAL for JOIN)
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
  -- CRITICAL: Types used in leave_balances for user's company
  -- This allows the JOIN to work
  id IN (
    SELECT DISTINCT lb.leave_type_id
    FROM leave_balances lb
    WHERE lb.company_id = (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid() 
      LIMIT 1
    )
  )
);

-- Step 4: Test if we can now see those leave_types
SELECT 
  'Can see leave_types now?' as step,
  COUNT(*) as accessible_count
FROM leave_types
WHERE id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() OR auth_user_id = auth.uid() 
    LIMIT 1
  )
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);

-- Step 5: Test the leave_types JOIN
SELECT 
  'Leave types JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 6: Test full JOIN
SELECT 
  'Full JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 7: Test the view
SELECT 
  'View test' as step,
  COUNT(*) as view_rows
FROM leave_balances_enhanced_view
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

