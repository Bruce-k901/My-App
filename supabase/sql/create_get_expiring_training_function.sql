-- =====================================================
-- Create get_expiring_training RPC Function
-- =====================================================
-- This function returns training records that are expiring within a specified number of days
-- Run this in Supabase SQL Editor if the function is missing (404 error) or returning 400 (Bad Request)
-- 
-- NOTE: This function works with the ACTUAL schema in your database:
-- - Uses user_id (not profile_id) 
-- - Uses training_type (not course_id)
-- - Uses completed_date (not completed_at)

-- Get employees with expiring training
CREATE OR REPLACE FUNCTION get_expiring_training(
  p_company_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  record_id UUID,
  profile_id UUID,
  employee_name TEXT,
  course_name TEXT,
  course_code TEXT,
  expiry_date DATE,
  days_until_expiry INTEGER,
  is_expired BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Validate input
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if training_records table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records') THEN
    RETURN;
  END IF;

  -- Check if table has user_id column (old schema) or profile_id column (new schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'training_records' 
    AND column_name = 'profile_id'
  ) THEN
    -- New schema with profile_id and course_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
       OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT 
      tr.id,
      tr.profile_id,
      COALESCE(p.full_name, 'Unknown')::TEXT,
      COALESCE(tc.name, 'Unknown Course')::TEXT,
      COALESCE(tc.code, '')::TEXT,
      tr.expiry_date,
      (tr.expiry_date - CURRENT_DATE)::INTEGER,
      tr.expiry_date < CURRENT_DATE
    FROM training_records tr
    JOIN profiles p ON p.id = tr.profile_id
    JOIN training_courses tc ON tc.id = tr.course_id
    WHERE p.company_id = p_company_id
      AND tr.status = 'completed'
      AND tr.expiry_date IS NOT NULL
      AND tr.expiry_date <= CURRENT_DATE + p_days_ahead
    ORDER BY tr.expiry_date;
  ELSE
    -- Old schema with user_id and training_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT 
      tr.id,
      tr.user_id as profile_id,
      COALESCE(p.full_name, 'Unknown')::TEXT,
      tr.training_type::TEXT as course_name,
      ''::TEXT as course_code,
      (tr.expiry_date::TEXT)::DATE as expiry_date,
      ((tr.expiry_date::TEXT)::DATE - CURRENT_DATE)::INTEGER as days_until_expiry,
      (tr.expiry_date::TEXT)::DATE < CURRENT_DATE as is_expired
    FROM training_records tr
    JOIN profiles p ON p.id = tr.user_id
    WHERE p.company_id = p_company_id
      AND tr.completed_date IS NOT NULL
      AND tr.expiry_date IS NOT NULL
      AND (tr.expiry_date::TEXT)::DATE <= CURRENT_DATE + p_days_ahead
    ORDER BY (tr.expiry_date::TEXT)::DATE;
  END IF;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_expiring_training(UUID, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_expiring_training(UUID, INTEGER) IS 
'Returns training records expiring within the specified number of days for a company. Returns empty result if required tables do not exist.';

