-- =====================================================
-- COMPLIANCE MATRIX VIEW
-- Created to work with the actual training_records schema
-- which uses training_type (enum) instead of course_id
-- =====================================================

DO $$
BEGIN
  -- Only create view if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Drop the view if it exists (from previous attempts)
    DROP VIEW IF EXISTS compliance_matrix_view CASCADE;

    -- Create compliance_matrix_view based on actual schema
    -- Note: This view works with training_type enum instead of course_id foreign key
    -- If training_courses exists, we'll use it; otherwise use distinct training_types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
      -- If training_courses exists, cross join with it and try to match training_type
      EXECUTE format('
        CREATE OR REPLACE VIEW compliance_matrix_view AS
        SELECT 
          p.id as profile_id,
          p.company_id,
          p.full_name,
          p.email,
          p.avatar_url,
          p.position_title,
          LOWER(COALESCE(p.app_role::TEXT, '''')) as app_role,
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
          COALESCE(tc.is_mandatory, false) as is_mandatory,
          tc.mandatory_for_roles,
          CASE 
            WHEN tr.completed_date IS NOT NULL THEN ''completed''
            ELSE ''not_started''
          END as training_status,
          tr.completed_date as completed_at,
          tr.expiry_date,
          CASE 
            WHEN tr.completed_date IS NOT NULL 
              AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) 
            THEN ''compliant''
            WHEN tr.completed_date IS NOT NULL 
              AND tr.expiry_date IS NOT NULL 
              AND tr.expiry_date <= CURRENT_DATE 
            THEN ''expired''
            WHEN tr.completed_date IS NOT NULL 
            THEN ''completed''
            WHEN tc.is_mandatory OR (tc.mandatory_for_roles IS NOT NULL AND LOWER(COALESCE(p.app_role::TEXT, '''')) = ANY(SELECT LOWER(unnest) FROM unnest(tc.mandatory_for_roles))) THEN ''required''
            ELSE ''optional''
          END as compliance_status
        FROM profiles p
        CROSS JOIN training_courses tc
        LEFT JOIN LATERAL (
          -- Get the most recent training record that matches this course
          SELECT tr.*
          FROM training_records tr
          WHERE tr.user_id = p.id 
            AND (
              LOWER(tr.training_type::TEXT) = LOWER(tc.name)
              OR LOWER(tr.training_type::TEXT) = LOWER(tc.code)
              OR LOWER(tc.name) LIKE ''%%'' || LOWER(tr.training_type::TEXT) || ''%%''
              OR LOWER(tr.training_type::TEXT) LIKE ''%%'' || LOWER(tc.name) || ''%%''
            )
          ORDER BY tr.completed_date DESC NULLS LAST, tr.expiry_date DESC NULLS LAST
          LIMIT 1
        ) tr ON true
        WHERE (p.status = ''active'' OR p.status IS NULL)
          AND tc.is_active = true
      ');
      
      RAISE NOTICE 'Created compliance_matrix_view using training_courses table with training_type matching';
    ELSE
      -- If training_courses doesn't exist, use distinct training_types from records
      EXECUTE format('
        CREATE OR REPLACE VIEW compliance_matrix_view AS
        SELECT 
          p.id as profile_id,
          p.company_id,
          p.full_name,
          p.email,
          p.avatar_url,
          p.position_title,
          LOWER(COALESCE(p.app_role::TEXT, '''')) as app_role,
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
          -- Use hash of training_type as course_id since we don''t have a real ID
          md5(tt.training_type::TEXT) as course_id,
          tt.training_type::TEXT as course_name,
          NULL as course_code,
          CASE 
            WHEN tt.training_type::TEXT ILIKE ''%%food%%'' OR tt.training_type::TEXT ILIKE ''%%safety%%'' THEN ''food_safety''
            WHEN tt.training_type::TEXT ILIKE ''%%health%%'' OR tt.training_type::TEXT ILIKE ''%%h&s%%'' THEN ''health_safety''
            WHEN tt.training_type::TEXT ILIKE ''%%fire%%'' THEN ''fire_safety''
            WHEN tt.training_type::TEXT ILIKE ''%%first%%aid%%'' THEN ''first_aid''
            WHEN tt.training_type::TEXT ILIKE ''%%allergen%%'' THEN ''allergens''
            ELSE ''other''
          END as category,
          false as is_mandatory,
          NULL as mandatory_for_roles,
          CASE 
            WHEN tr.completed_date IS NOT NULL THEN ''completed''
            ELSE ''not_started''
          END as training_status,
          tr.completed_date as completed_at,
          tr.expiry_date,
          CASE 
            WHEN tr.completed_date IS NOT NULL 
              AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) 
            THEN ''compliant''
            WHEN tr.completed_date IS NOT NULL 
              AND tr.expiry_date IS NOT NULL 
              AND tr.expiry_date <= CURRENT_DATE 
            THEN ''expired''
            WHEN tr.completed_date IS NOT NULL 
            THEN ''completed''
            ELSE ''required''
          END as compliance_status
        FROM profiles p
        CROSS JOIN (
          SELECT DISTINCT training_type
          FROM training_records
          WHERE training_type IS NOT NULL
        ) tt
        LEFT JOIN LATERAL (
          -- Get the most recent training record for this user and training type
          SELECT tr.*
          FROM training_records tr
          WHERE tr.user_id = p.id 
            AND tr.training_type = tt.training_type
          ORDER BY tr.completed_date DESC NULLS LAST, tr.expiry_date DESC NULLS LAST
          LIMIT 1
        ) tr ON true
        WHERE (p.status = ''active'' OR p.status IS NULL)
      ');
      
      RAISE NOTICE 'Created compliance_matrix_view using distinct training_types from training_records';
    END IF;

    GRANT SELECT ON compliance_matrix_view TO authenticated;

  ELSE
    RAISE NOTICE '⚠️ Required tables (training_records, profiles) do not exist yet - skipping view creation';
  END IF;
END $$;
