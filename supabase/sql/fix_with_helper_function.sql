-- Fix using SECURITY DEFINER helper function to avoid RLS recursion
-- This creates a function that bypasses RLS to get leave_type_ids

-- Step 1: Create helper function to get leave_type_ids (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_company_leave_type_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_type_ids UUID[];
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  SELECT ARRAY_AGG(DISTINCT leave_type_id)
  INTO v_type_ids
  FROM leave_balances
  WHERE company_id = v_company_id;
  
  RETURN COALESCE(v_type_ids, ARRAY[]::UUID[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_leave_type_ids() TO authenticated;

-- Step 2: Fix leave_types RLS using the helper function
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;

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
  -- Types used in leave_balances (using helper function to avoid recursion)
  id = ANY(public.get_company_leave_type_ids())
);

-- Step 3: Test if we can see those leave_types
SELECT 
  'Can see leave_types now?' as step,
  COUNT(*) as accessible_count
FROM leave_types
WHERE id = ANY(public.get_company_leave_type_ids());

-- Step 4: Test the leave_types JOIN
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

-- Step 5: Test full JOIN
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

-- Step 6: Test the view
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

