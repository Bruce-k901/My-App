-- Diagnose which JOIN is failing
-- Run this and share ALL results

-- Step 1: Do balances exist? (bypassing RLS)
CREATE OR REPLACE FUNCTION public.check_balances_exist()
RETURNS TABLE(
  step TEXT,
  count BIGINT
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
  SELECT 
    'Balances exist (bypassing RLS)'::TEXT,
    COUNT(*)::BIGINT
  FROM leave_balances
  WHERE company_id = v_company_id
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
END;
$$;

SELECT * FROM public.check_balances_exist();

-- Step 2: Can we see balances directly? (with RLS)
SELECT 
  'Can see balances (with RLS)' as step,
  COUNT(*) as count
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 3: Can we see profiles?
SELECT 
  'Can see profiles' as step,
  COUNT(*) as count
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
);

-- Step 4: Can we see leave_types?
SELECT 
  'Can see leave_types' as step,
  COUNT(*) as count
FROM leave_types
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
OR company_id IS NULL;

-- Step 5: Test profiles JOIN
SELECT 
  'Profiles JOIN test' as step,
  COUNT(*) as count
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 6: Test leave_types JOIN
SELECT 
  'Leave types JOIN test' as step,
  COUNT(*) as count
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 7: Show what leave_type_ids are in balances
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

-- Step 8: Can we see those specific leave_types?
SELECT 
  'Can see those leave_types' as step,
  COUNT(*) as count
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

