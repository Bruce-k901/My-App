-- Create training_stats_view if it doesn't exist
DO $$
DECLARE
  v_profile_column TEXT;
  v_course_column TEXT;
BEGIN
  -- Determine which column name to use (profile_id or user_id)
  SELECT column_name INTO v_profile_column
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'training_records'
    AND column_name IN ('profile_id', 'user_id')
  LIMIT 1;

  -- Determine which column name to use for course (course_id or training_course_id)
  SELECT column_name INTO v_course_column
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'training_records'
    AND column_name IN ('course_id', 'training_course_id', 'training_id', 'linked_training_id')
  LIMIT 1;

  -- If required columns don't exist, skip view creation
  IF v_profile_column IS NULL OR v_course_column IS NULL THEN
    RAISE NOTICE '⚠️ Required columns not found - skipping view creation';
    RETURN;
  END IF;

  -- Create training_stats_view
  EXECUTE format('
    CREATE OR REPLACE VIEW training_stats_view AS
    SELECT 
      tc.company_id,
      tc.id as course_id,
      tc.name as course_name,
      tc.code as course_code,
      tc.category,
      tc.is_mandatory,
      COUNT(DISTINCT p.id) as total_employees,
      COUNT(DISTINCT CASE WHEN tr.status = ''completed'' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN tr.%I END) as completed_valid,
      COUNT(DISTINCT CASE WHEN tr.status = ''completed'' AND tr.expiry_date <= CURRENT_DATE THEN tr.%I END) as expired,
      COUNT(DISTINCT CASE WHEN tr.status = ''in_progress'' THEN tr.%I END) as in_progress,
      COUNT(DISTINCT CASE WHEN tr.status = ''completed'' AND tr.expiry_date <= CURRENT_DATE + 30 AND tr.expiry_date > CURRENT_DATE THEN tr.%I END) as expiring_30_days,
      ROUND(
        COUNT(DISTINCT CASE WHEN tr.status = ''completed'' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN tr.%I END)::DECIMAL * 100 / 
        NULLIF(COUNT(DISTINCT p.id), 0),
        1
      ) as compliance_percentage
    FROM training_courses tc
    LEFT JOIN profiles p ON p.company_id = tc.company_id AND (p.status = ''active'' OR p.status IS NULL)
    LEFT JOIN training_records tr ON tr.%I = tc.id AND tr.%I = p.id
    WHERE tc.is_active = true
    GROUP BY tc.company_id, tc.id, tc.name, tc.code, tc.category, tc.is_mandatory
  ', v_profile_column, v_profile_column, v_profile_column, v_profile_column, v_profile_column, v_course_column, v_profile_column);

  GRANT SELECT ON training_stats_view TO authenticated;
  
  RAISE NOTICE 'Created training_stats_view using columns: profile=%I, course=%I', v_profile_column, v_course_column;
END $$;
