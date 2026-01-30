-- Initialize leave balances for all employees who don't have them
-- This creates balances for the current year

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
  
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Get the default/annual leave type
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
  
  IF v_leave_type_id IS NULL THEN
    RAISE NOTICE 'No leave_types found for company. Please create a leave type first.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Using leave_type_id: %, year: %', v_leave_type_id, v_current_year;
  
  -- Create balances for all employees who don't have one for the current year
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
        COALESCE(v_profile.annual_leave_allowance, 28) -- Default to 28 days if not set
      )
      ON CONFLICT (profile_id, leave_type_id, year) DO NOTHING;
      
      v_created_count := v_created_count + 1;
      RAISE NOTICE 'Created balance for: % (%)', COALESCE(v_profile.full_name, v_profile.email), v_profile.id;
    EXCEPTION WHEN OTHERS THEN
      v_skipped_count := v_skipped_count + 1;
      RAISE NOTICE 'Failed to create balance for %: %', v_profile.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Finished! Created % balances, skipped %', v_created_count, v_skipped_count;
END $$;

-- Verify balances were created
SELECT 
  'Summary' as step,
  COUNT(*) as total_balances,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

