-- =====================================================
-- Fix compliance_matrix_view to ensure no duplicates using DISTINCT
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'compliance_matrix_view') THEN
    
    DROP VIEW IF EXISTS compliance_matrix_view CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
      
      -- Use DISTINCT ON to ensure uniqueness per profile_id + course_id combination
      EXECUTE format('
        CREATE OR REPLACE VIEW compliance_matrix_view AS
        SELECT DISTINCT ON (p.id, tc.id)
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
          SELECT tr.*
          FROM training_records tr
          WHERE tr.user_id = p.id 
            AND (
              LOWER(tr.training_type::TEXT) = LOWER(tc.name)
              OR LOWER(tr.training_type::TEXT) = LOWER(tc.code)
            )
          ORDER BY tr.completed_date DESC NULLS LAST, tr.expiry_date DESC NULLS LAST
          LIMIT 1
        ) tr ON true
        WHERE (p.status = ''active'' OR p.status IS NULL)
          AND tc.is_active = true
        ORDER BY p.id, tc.id, tr.completed_date DESC NULLS LAST, tr.expiry_date DESC NULLS LAST
      ');
      
      RAISE NOTICE 'Recreated compliance_matrix_view with DISTINCT ON to prevent duplicates';
      
    ELSE
      -- If training_courses doesn't exist
      EXECUTE format('
        CREATE OR REPLACE VIEW compliance_matrix_view AS
        SELECT DISTINCT ON (p.id, md5(tt.training_type::TEXT))
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
          SELECT tr.*
          FROM training_records tr
          WHERE tr.user_id = p.id 
            AND tr.training_type = tt.training_type
          ORDER BY tr.completed_date DESC NULLS LAST, tr.expiry_date DESC NULLS LAST
          LIMIT 1
        ) tr ON true
        WHERE (p.status = ''active'' OR p.status IS NULL)
        ORDER BY p.id, md5(tt.training_type::TEXT), tr.completed_date DESC NULLS LAST, tr.expiry_date DESC NULLS LAST
      ');
      
      RAISE NOTICE 'Recreated compliance_matrix_view using distinct training_types with DISTINCT ON';
    END IF;

    GRANT SELECT ON compliance_matrix_view TO authenticated;
    
    RAISE NOTICE '✅ compliance_matrix_view recreated with DISTINCT ON to prevent duplicates';
    
  ELSE
    RAISE NOTICE 'compliance_matrix_view does not exist - skipping fix';
  END IF;
END $$;

