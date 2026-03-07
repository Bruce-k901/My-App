-- Quick verification: Do balances exist and can we see them?

-- Step 1: Count balances (bypassing RLS)
CREATE OR REPLACE FUNCTION public.count_leave_balances()
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
    'Total balances (bypassing RLS)'::TEXT,
    COUNT(*)::BIGINT
  FROM leave_balances
  WHERE company_id = v_company_id
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
END;
$$;

SELECT * FROM public.count_leave_balances();

-- Step 2: Test direct query (with RLS)
SELECT 
  'Direct query (with RLS)' as step,
  COUNT(*) as count
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 3: Test with profile join
SELECT 
  'With profile join' as step,
  COUNT(*) as count
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 4: Test with both joins
SELECT 
  'With both joins' as step,
  COUNT(*) as count
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 5: Show sample
SELECT 
  'Sample data' as step,
  lb.id,
  lb.profile_id,
  p.full_name,
  lb.leave_type_id,
  lt.name as leave_type_name,
  lb.year,
  lb.entitled_days
FROM leave_balances lb
LEFT JOIN profiles p ON p.id = lb.profile_id
LEFT JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
LIMIT 5;

