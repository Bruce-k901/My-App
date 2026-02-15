-- Simple test bypassing RLS to see what's actually in the database
-- This uses SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION public.debug_leave_balances()
RETURNS TABLE(
  step TEXT,
  result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get company_id
  SELECT company_id INTO v_company_id
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1;
  
  -- Step 1: Count leave_balances
  RETURN QUERY
  SELECT 
    'leave_balances count'::TEXT,
    COUNT(*)::TEXT
  FROM leave_balances
  WHERE company_id = v_company_id
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Step 2: Show leave_type_ids
  RETURN QUERY
  SELECT 
    'leave_type_ids'::TEXT,
    string_agg(DISTINCT leave_type_id::TEXT, ', ')
  FROM leave_balances
  WHERE company_id = v_company_id
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Step 3: Count leave_types (bypassing RLS)
  RETURN QUERY
  SELECT 
    'leave_types total count'::TEXT,
    COUNT(*)::TEXT
  FROM leave_types;
  
  -- Step 4: Count matching leave_types
  RETURN QUERY
  SELECT 
    'matching leave_types count'::TEXT,
    COUNT(*)::TEXT
  FROM leave_types
  WHERE id IN (
    SELECT DISTINCT leave_type_id 
    FROM leave_balances 
    WHERE company_id = v_company_id
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  );
  
  -- Step 5: Show leave_types details
  RETURN QUERY
  SELECT 
    'leave_types details'::TEXT,
    string_agg(lt.id::TEXT || ':' || COALESCE(lt.name, 'null') || ':' || COALESCE(lt.company_id::TEXT, 'null'), ' | ')
  FROM leave_types lt
  WHERE lt.id IN (
    SELECT DISTINCT leave_type_id 
    FROM leave_balances 
    WHERE company_id = v_company_id
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  );
  
  -- Step 6: Test JOIN (bypassing RLS)
  RETURN QUERY
  SELECT 
    'JOIN test (bypassing RLS)'::TEXT,
    COUNT(*)::TEXT
  FROM leave_balances lb
  JOIN leave_types lt ON lt.id = lb.leave_type_id
  WHERE lb.company_id = v_company_id
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
END;
$$;

SELECT * FROM public.debug_leave_balances();

