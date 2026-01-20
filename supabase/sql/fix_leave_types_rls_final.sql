-- FINAL FIX: The leave_types JOIN is failing because RLS blocks access
-- We need to allow access to leave_types used in leave_balances

-- Step 1: Show what leave_type_ids are in your balances
SELECT 
  'leave_type_ids in balances' as step,
  lb.leave_type_id,
  COUNT(*) as balance_count
FROM leave_balances lb
WHERE lb.company_id = public.get_user_company_id_safe()
GROUP BY lb.leave_type_id;

-- Step 2: Check if those leave_types exist (bypassing RLS with a function)
CREATE OR REPLACE FUNCTION public.check_leave_types_exist()
RETURNS TABLE(
  leave_type_id UUID,
  exists_in_table BOOLEAN,
  lt_company_id UUID,
  lt_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1;
  
  RETURN QUERY
  SELECT DISTINCT
    lb.leave_type_id,
    EXISTS(SELECT 1 FROM leave_types lt2 WHERE lt2.id = lb.leave_type_id) as exists_in_table,
    lt.company_id as lt_company_id,
    lt.name as lt_name
  FROM leave_balances lb
  LEFT JOIN leave_types lt ON lt.id = lb.leave_type_id
  WHERE lb.company_id = v_company_id
  GROUP BY lb.leave_type_id, lt.company_id, lt.name;
END;
$$;

SELECT * FROM public.check_leave_types_exist();

-- Step 3: Fix leave_types RLS - Allow access to ANY leave_type used in leave_balances
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;
DROP POLICY IF EXISTS "manage_leave_types" ON leave_types;

-- Simple policy: Allow access to leave_types used in leave_balances for user's company
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
  WHERE company_id = public.get_user_company_id_safe()
);

-- Step 5: Test the JOIN
SELECT 
  'JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 6: Test full JOIN
SELECT 
  'Full JOIN test' as step,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 7: Test the view
SELECT 
  'View test' as step,
  COUNT(*) as view_rows
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

