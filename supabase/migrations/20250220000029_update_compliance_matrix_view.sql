-- =====================================================
-- UPDATE COMPLIANCE MATRIX VIEW
-- Include assignment status and be single source of truth
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
DECLARE
  v_profile_column TEXT;
  v_course_column TEXT;
BEGIN
  -- Only update view if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_assignments') THEN

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
      AND column_name IN ('course_id', 'training_course_id', 'training_id')
    LIMIT 1;

    -- If required columns don't exist, skip view update
    IF v_profile_column IS NULL OR v_course_column IS NULL THEN
      RAISE NOTICE '⚠️ Required columns not found - skipping compliance_matrix_view update';
      RETURN;
    END IF;

    -- Update compliance_matrix_view to include assignment status
    EXECUTE format('
      CREATE OR REPLACE VIEW compliance_matrix_view AS
      SELECT 
        p.id as profile_id,
        p.company_id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.position_title,
        LOWER(p.app_role) as app_role,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''profiles'' AND column_name = ''home_site'')
          THEN p.home_site
          WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''profiles'' AND column_name = ''site_id'')
          THEN p.site_id
          ELSE NULL
        END as home_site,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = ''sites'')
          THEN (SELECT name FROM sites WHERE id = CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''profiles'' AND column_name = ''home_site'')
            THEN p.home_site
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''profiles'' AND column_name = ''site_id'')
            THEN p.site_id
            ELSE NULL
          END)
          ELSE NULL
        END as site_name,
        tc.id as course_id,
        tc.name as course_name,
        tc.code as course_code,
        tc.category,
        tc.is_mandatory,
        tc.mandatory_for_roles,
        COALESCE(tr.status, ''not_started'') as training_status,
        tr.completed_at,
        tr.expiry_date,
        tr.score_percentage,
        tr.passed,
        tr.certificate_number,
        ca.id as assignment_id,
        ca.status as assignment_status,
        ca.confirmed_at,
        ca.deadline_date,
        CASE 
          WHEN tr.passed = TRUE AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN ''current''
          WHEN tr.passed = TRUE AND tr.expiry_date <= CURRENT_DATE + INTERVAL ''30 days'' AND tr.expiry_date > CURRENT_DATE THEN ''expiring_soon''
          WHEN tr.passed = TRUE AND tr.expiry_date <= CURRENT_DATE THEN ''expired''
          WHEN ca.status = ''in_progress'' THEN ''in_progress''
          WHEN ca.status = ''confirmed'' THEN ''assigned''
          WHEN ca.status = ''invited'' THEN ''invited''
          WHEN tc.is_mandatory OR (tc.mandatory_for_roles IS NOT NULL AND LOWER(p.app_role) = ANY(SELECT LOWER(unnest) FROM unnest(tc.mandatory_for_roles))) THEN ''required''
          ELSE ''optional''
        END as compliance_status
      FROM profiles p
      CROSS JOIN training_courses tc
      LEFT JOIN training_records tr ON tr.%I = p.id AND tr.%I = tc.id
        AND tr.status IN (''completed'', ''in_progress'', ''not_started'')
      LEFT JOIN course_assignments ca ON ca.profile_id = p.id 
        AND ca.course_id = tc.id 
        AND ca.status != ''completed''
      WHERE (p.status = ''active'' OR p.status IS NULL)
        AND tc.is_active = true
    ', v_profile_column, v_course_column, v_profile_column, v_course_column);

    GRANT SELECT ON compliance_matrix_view TO authenticated;

    RAISE NOTICE 'Updated compliance_matrix_view to include assignment status';

  ELSE
    RAISE NOTICE '⚠️ Required tables do not exist yet - skipping compliance_matrix_view update';
  END IF;
END $$;
