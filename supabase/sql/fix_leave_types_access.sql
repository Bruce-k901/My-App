-- Fix leave_types RLS - the issue is we can't see the leave_types used in balances

-- Step 1: Show what leave_type_ids are in your balances
SELECT 
  'Step 1: leave_type_ids in balances' as step,
  lb.leave_type_id,
  COUNT(*) as balance_count
FROM leave_balances lb
WHERE lb.company_id = public.get_user_company_id_safe()
GROUP BY lb.leave_type_id;

-- Step 2: Show what those leave_types look like (without RLS check)
-- This uses a function to bypass RLS temporarily
DO $$
DECLARE
  v_company_id UUID;
  v_leave_type_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  RAISE NOTICE 'Company ID: %', v_company_id;
  
  -- Show leave_types that should be accessible
  FOR v_leave_type_id IN 
    SELECT DISTINCT leave_type_id 
    FROM leave_balances 
    WHERE company_id = v_company_id
  LOOP
    RAISE NOTICE 'Leave type ID in balances: %', v_leave_type_id;
  END LOOP;
END $$;

-- Step 3: Check what company_id those leave_types have
-- We'll query directly to see the issue
SELECT 
  'Step 3: leave_types details' as step,
  lt.id,
  lt.name,
  lt.code,
  lt.company_id,
  CASE 
    WHEN lt.company_id IS NULL THEN 'Global (should be accessible)'
    WHEN lt.company_id = public.get_user_company_id_safe() THEN 'Your company (should be accessible)'
    ELSE 'Different company (problem!)'
  END as access_status
FROM leave_types lt
WHERE lt.id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = public.get_user_company_id_safe()
);

-- Step 4: Fix leave_types RLS to allow access to types used in balances
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;

-- New policy: Allow access to leave_types used in leave_balances for user's company
CREATE POLICY "leave_types_select_company"
ON leave_types FOR SELECT
USING (
  -- Global types (company_id IS NULL)
  company_id IS NULL
  OR
  -- Types in user's company
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR (p.auth_user_id IS NOT NULL AND p.auth_user_id = auth.uid()))
      AND p.company_id = leave_types.company_id
  )
  OR
  -- Types used in leave_balances for user's company (CRITICAL for JOIN)
  EXISTS (
    SELECT 1 
    FROM leave_balances lb
    JOIN profiles p ON p.company_id = lb.company_id
    WHERE lb.leave_type_id = leave_types.id
      AND (p.id = auth.uid() OR (p.auth_user_id IS NOT NULL AND p.auth_user_id = auth.uid()))
      AND p.company_id IS NOT NULL
  )
);

-- Step 5: Test if we can now see those leave_types
SELECT 
  'Step 5: Can see leave_types now?' as step,
  COUNT(*) as accessible_count
FROM leave_types
WHERE id IN (
  SELECT DISTINCT leave_type_id 
  FROM leave_balances 
  WHERE company_id = public.get_user_company_id_safe()
);

-- Step 6: Test the JOIN
SELECT 
  'Step 6: JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe();

-- Step 7: Test full JOIN
SELECT 
  'Step 7: Full JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 8: Test the view
SELECT 
  'Step 8: View test' as step,
  COUNT(*) as view_rows
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

