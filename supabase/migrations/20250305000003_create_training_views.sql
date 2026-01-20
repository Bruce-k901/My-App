-- =====================================================
-- TRAINING RECORDS VIEW
-- Full details of training records
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
DECLARE
  v_profile_column TEXT;
  v_course_column TEXT;
BEGIN
  -- Only create views if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN

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

    -- If required columns don't exist, skip view creation
    IF v_profile_column IS NULL THEN
      RAISE NOTICE '⚠️ training_records table does not have profile_id or user_id column - skipping view creation';
      RETURN;
    END IF;

    IF v_course_column IS NULL THEN
      RAISE NOTICE '⚠️ training_records table does not have course_id, training_course_id, or training_id column - skipping view creation';
      RETURN;
    END IF;

    -- Create training_records_view
    EXECUTE format('
      CREATE OR REPLACE VIEW training_records_view AS
      SELECT 
        tr.id as record_id,
        tr.company_id,
        tr.%I as profile_id,
        tr.%I as course_id,
        tr.status,
        tr.started_at,
        tr.completed_at,
        tr.score_percentage,
        tr.passed,
        tr.certificate_number,
        tr.certificate_url,
        tr.issued_date,
        tr.expiry_date,
        tr.verified,
        tr.verified_by,
        tr.notes,
        tr.trainer_name,
        p.full_name as employee_name,
        p.email as employee_email,
        p.avatar_url as employee_avatar,
        p.position_title,
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
        tc.name as course_name,
        tc.code as course_code,
        tc.category as course_category,
        tc.course_type,
        tc.is_mandatory,
        tc.certification_name,
        tc.renewal_required,
        tc.renewal_reminder_days,
        CASE 
          WHEN tr.expiry_date IS NULL THEN NULL
          WHEN tr.expiry_date < CURRENT_DATE THEN ''expired''
          WHEN tr.expiry_date <= CURRENT_DATE + COALESCE(tc.renewal_reminder_days, 30) THEN ''expiring_soon''
          ELSE ''valid''
        END as validity_status,
        CASE 
          WHEN tr.expiry_date IS NOT NULL THEN tr.expiry_date - CURRENT_DATE
          ELSE NULL
        END as days_until_expiry
      FROM training_records tr
      JOIN profiles p ON p.id = tr.%I
      JOIN training_courses tc ON tc.id = tr.%I
    ', v_profile_column, v_course_column, v_profile_column, v_course_column);

    GRANT SELECT ON training_records_view TO authenticated;

    -- =====================================================
    -- COMPLIANCE MATRIX VIEW
    -- Who has what training
    -- =====================================================

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
        CASE 
          WHEN tr.status = ''completed'' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN ''compliant''
          WHEN tr.status = ''completed'' AND tr.expiry_date <= CURRENT_DATE THEN ''expired''
          WHEN tr.status = ''in_progress'' THEN ''in_progress''
          WHEN tc.is_mandatory OR (tc.mandatory_for_roles IS NOT NULL AND LOWER(p.app_role) = ANY(SELECT LOWER(unnest) FROM unnest(tc.mandatory_for_roles))) THEN ''required''
          ELSE ''optional''
        END as compliance_status
      FROM profiles p
      CROSS JOIN training_courses tc
      LEFT JOIN training_records tr ON tr.%I = p.id AND tr.%I = tc.id
        AND tr.status IN (''completed'', ''in_progress'', ''not_started'')
      WHERE (p.status = ''active'' OR p.status IS NULL)
        AND tc.is_active = true
    ', v_profile_column, v_course_column);

    GRANT SELECT ON compliance_matrix_view TO authenticated;

    -- =====================================================
    -- TRAINING STATS VIEW
    -- Company-wide training statistics
    -- =====================================================

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

    -- =====================================================
    -- COMPANY TRAINING OVERVIEW
    -- =====================================================

    EXECUTE format('
      CREATE OR REPLACE VIEW company_training_overview AS
      SELECT 
        p.company_id,
        COUNT(DISTINCT p.id) as total_employees,
        COUNT(DISTINCT CASE WHEN NOT EXISTS (
          SELECT 1 FROM training_courses tc
          LEFT JOIN training_records tr ON tr.%I = tc.id AND tr.%I = p.id
          WHERE tc.company_id = p.company_id 
            AND tc.is_active = true
            AND tc.is_mandatory = true
            AND (tr.status IS NULL OR tr.status != ''completed'' OR (tr.expiry_date IS NOT NULL AND tr.expiry_date <= CURRENT_DATE))
        ) THEN p.id END) as fully_compliant,
        (SELECT COUNT(*) FROM training_records tr2 
         WHERE tr2.company_id = p.company_id 
           AND tr2.status = ''completed'' 
           AND tr2.expiry_date IS NOT NULL 
           AND tr2.expiry_date <= CURRENT_DATE + 30
           AND tr2.expiry_date > CURRENT_DATE) as expiring_30_days,
        (SELECT COUNT(*) FROM training_records tr3 
         WHERE tr3.company_id = p.company_id 
           AND tr3.status = ''completed'' 
           AND tr3.expiry_date IS NOT NULL 
           AND tr3.expiry_date <= CURRENT_DATE) as expired_count
      FROM profiles p
      WHERE p.status = ''active'' OR p.status IS NULL
      GROUP BY p.company_id
    ', v_course_column, v_profile_column);

    GRANT SELECT ON company_training_overview TO authenticated;

    RAISE NOTICE 'Created training views using columns: profile=%I, course=%I', v_profile_column, v_course_column;

  ELSE
    RAISE NOTICE '⚠️ Required tables (training_records, profiles, training_courses) do not exist yet - skipping training views creation';
  END IF;
END $$;
