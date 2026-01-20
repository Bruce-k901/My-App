-- Create balances by specifying company_id directly
-- Use this if auth.uid() is NULL (no authenticated context in SQL editor)
-- Replace 'YOUR_COMPANY_ID_HERE' with your actual company_id UUID

-- First, find your company_id
SELECT 
  p.id as profile_id,
  p.email,
  p.full_name,
  p.company_id,
  'Use this company_id below' as note
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 1: Replace 'YOUR_COMPANY_ID_HERE' with your actual company_id from above
-- ============================================================================

DO $$
DECLARE
  v_company_id UUID := 'YOUR_COMPANY_ID_HERE'::UUID; -- ⚠️ REPLACE THIS!
  v_leave_type_id UUID;
  v_profile RECORD;
  v_current_year INTEGER;
  v_created_count INTEGER := 0;
BEGIN
  -- Validate company_id
  IF v_company_id = 'YOUR_COMPANY_ID_HERE'::UUID THEN
    RAISE EXCEPTION 'Please replace YOUR_COMPANY_ID_HERE with your actual company_id UUID';
  END IF;
  
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
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
    RAISE EXCEPTION 'No leave_types found for company %. Please create a leave type first.', v_company_id;
  END IF;
  
  RAISE NOTICE 'Using leave_type_id: %', v_leave_type_id;
  
  -- Create balances for all employees who don't have one for the current year
  FOR v_profile IN 
    SELECT p.id, p.annual_leave_allowance, p.company_id, p.email, p.full_name
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
      RAISE NOTICE '✅ Created balance for: % (%)', COALESCE(v_profile.full_name, v_profile.email), v_profile.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed to create balance for %: %', v_profile.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Finished! Created % balances', v_created_count;
END $$;

-- Verify balances were created
SELECT 
  COUNT(*) as total_balances_created,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = 'YOUR_COMPANY_ID_HERE'::UUID  -- ⚠️ REPLACE THIS TOO!
AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Show the balances that were created
SELECT 
  lb.id,
  p.full_name,
  p.email,
  lt.name as leave_type,
  lb.year,
  lb.entitled_days,
  lb.taken_days,
  lb.pending_days,
  (lb.entitled_days - lb.taken_days - lb.pending_days) as remaining
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = 'YOUR_COMPANY_ID_HERE'::UUID  -- ⚠️ REPLACE THIS TOO!
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY p.full_name;

