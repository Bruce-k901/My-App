-- Create leave balances for all employees and verify they're visible
-- This handles the full process: create leave type if needed, create balances, verify

DO $$
DECLARE
  v_company_id UUID;
  v_leave_type_id UUID;
  v_profile RECORD;
  v_current_year INTEGER;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Get current company_id
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No company_id found for current user';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Company ID: %', v_company_id;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Step 1: Check if leave_types exist, create one if not
  SELECT id INTO v_leave_type_id
  FROM leave_types
  WHERE company_id = v_company_id
    AND (code = 'ANNUAL' OR name ILIKE '%annual%' OR name ILIKE '%holiday%')
  LIMIT 1;
  
  -- If no specific annual leave type found, use the first one
  IF v_leave_type_id IS NULL THEN
    SELECT id INTO v_leave_type_id
    FROM leave_types
    WHERE company_id = v_company_id
    LIMIT 1;
  END IF;
  
  -- If still no leave type, create one
  IF v_leave_type_id IS NULL THEN
    RAISE NOTICE 'No leave type found. Creating default "Annual Leave" type...';
    
    INSERT INTO leave_types (
      company_id,
      name,
      code,
      color,
      deducts_from_allowance,
      requires_approval,
      is_active
    )
    VALUES (
      v_company_id,
      'Annual Leave',
      'ANNUAL',
      '#10B981',
      TRUE,
      TRUE,
      TRUE
    )
    RETURNING id INTO v_leave_type_id;
    
    RAISE NOTICE 'Created leave type with id: %', v_leave_type_id;
  ELSE
    RAISE NOTICE 'Using existing leave type: %', v_leave_type_id;
  END IF;
  
  -- Step 2: Create balances for all employees
  FOR v_profile IN 
    SELECT p.id, p.annual_leave_allowance, p.company_id, p.email, p.full_name, p.start_date
    FROM profiles p
    WHERE p.company_id = v_company_id
      AND NOT EXISTS (
        SELECT 1 FROM leave_balances lb
        WHERE lb.profile_id = p.id
          AND lb.year = v_current_year
          AND lb.leave_type_id = v_leave_type_id
      )
  LOOP
    BEGIN
      INSERT INTO leave_balances (
        company_id,
        profile_id,
        leave_type_id,
        year,
        entitled_days
      )
      VALUES (
        v_profile.company_id,
        v_profile.id,
        v_leave_type_id,
        v_current_year,
        COALESCE(v_profile.annual_leave_allowance, 28)
      )
      ON CONFLICT (profile_id, leave_type_id, year) DO NOTHING;
      
      v_created_count := v_created_count + 1;
      RAISE NOTICE 'Created balance for: % (%) - % days', 
        COALESCE(v_profile.full_name, v_profile.email), 
        v_profile.id,
        COALESCE(v_profile.annual_leave_allowance, 28);
    EXCEPTION WHEN OTHERS THEN
      v_skipped_count := v_skipped_count + 1;
      RAISE NOTICE 'Failed to create balance for %: %', v_profile.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Finished! Created % balances, skipped %', v_created_count, v_skipped_count;
END $$;

-- Step 3: Verify balances were created
SELECT 
  'Balances created' as step,
  COUNT(*) as total_balances,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 4: Test if balances are visible via direct query
SELECT 
  'Direct query test' as step,
  COUNT(*) as visible_balances
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 5: Test if view works
SELECT 
  'View test' as step,
  COUNT(*) as view_rows,
  COUNT(DISTINCT profile_id) as unique_employees_in_view
FROM leave_balances_enhanced_view
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 6: Show sample balances
SELECT 
  'Sample balances' as step,
  profile_id,
  full_name,
  leave_type_name,
  year,
  entitled_days,
  available_days,
  accrued_days
FROM leave_balances_enhanced_view
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
ORDER BY full_name
LIMIT 10;

