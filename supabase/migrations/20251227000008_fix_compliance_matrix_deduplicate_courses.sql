-- =====================================================
-- Fix compliance_matrix_view to deduplicate courses by name+code
-- The training_courses table has duplicate courses with different IDs
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'compliance_matrix_view') THEN
    
    DROP VIEW IF EXISTS compliance_matrix_view CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
      
      -- Use a subquery to deduplicate courses by name+code per company, picking the first course_id
      EXECUTE format('
        CREATE OR REPLACE VIEW compliance_matrix_view AS
        WITH deduplicated_courses AS (
          -- Get one course_id per unique (company_id, name, code) combination
          SELECT DISTINCT ON (tc.company_id, tc.name, tc.code)
            tc.company_id,
            tc.id as course_id,
            tc.name as course_name,
            tc.code as course_code,
            tc.category,
            tc.is_mandatory,
            tc.mandatory_for_roles
          FROM training_courses tc
          WHERE tc.is_active = true
          ORDER BY tc.company_id, tc.name, tc.code, tc.id  -- Consistent ordering: pick the first ID alphabetically
        )
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
          dc.course_id,
          dc.course_name,
          dc.course_code,
          dc.category,
          COALESCE(dc.is_mandatory, false) as is_mandatory,
          dc.mandatory_for_roles,
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
            WHEN dc.is_mandatory OR (dc.mandatory_for_roles IS NOT NULL AND LOWER(COALESCE(p.app_role::TEXT, '''')) = ANY(SELECT LOWER(unnest) FROM unnest(dc.mandatory_for_roles))) THEN ''required''
            ELSE ''optional''
          END as compliance_status
        FROM profiles p
        INNER JOIN deduplicated_courses dc ON dc.company_id = p.company_id
        LEFT JOIN LATERAL (
          -- Get the most recent training record that matches this course
          -- Match by course name or code (since training_records uses training_type enum)
          SELECT tr.*
          FROM training_records tr
          WHERE tr.user_id = p.id 
            AND (
              LOWER(tr.training_type::TEXT) = LOWER(dc.course_name)
              OR LOWER(tr.training_type::TEXT) = LOWER(dc.course_code)
            )
          ORDER BY tr.completed_date DESC NULLS LAST, tr.expiry_date DESC NULLS LAST
          LIMIT 1
        ) tr ON true
        WHERE (p.status = ''active'' OR p.status IS NULL)
      ');
      
      RAISE NOTICE 'Recreated compliance_matrix_view with course deduplication by name+code';
      
    ELSE
      -- If training_courses doesn't exist, use distinct training_types
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
      
      RAISE NOTICE 'Recreated compliance_matrix_view using distinct training_types';
    END IF;

    GRANT SELECT ON compliance_matrix_view TO authenticated;
    
    RAISE NOTICE '✅ compliance_matrix_view recreated with course deduplication';
    
  ELSE
    RAISE NOTICE 'compliance_matrix_view does not exist - skipping fix';
  END IF;
END $$;

