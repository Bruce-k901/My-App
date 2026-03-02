-- Manual creation of compliance_matrix_view
-- Run this if the automatic migration didn't work
-- First, check what columns your training_records table has by running check_training_views_status.sql

-- If your table uses 'user_id' and 'course_id', use this:
/*
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
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site')
    THEN p.home_site
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id')
    THEN p.site_id
    ELSE NULL
  END as home_site,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
    THEN (SELECT name FROM sites WHERE id = CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site')
      THEN p.home_site
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id')
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
  COALESCE(tr.status, 'not_started') as training_status,
  tr.completed_at,
  tr.expiry_date,
  CASE 
    WHEN tr.status = 'completed' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN 'compliant'
    WHEN tr.status = 'completed' AND tr.expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN tr.status = 'in_progress' THEN 'in_progress'
    WHEN tc.is_mandatory OR (tc.mandatory_for_roles IS NOT NULL AND LOWER(p.app_role) = ANY(SELECT LOWER(unnest) FROM unnest(tc.mandatory_for_roles))) THEN 'required'
    ELSE 'optional'
  END as compliance_status
FROM profiles p
CROSS JOIN training_courses tc
LEFT JOIN training_records tr ON tr.user_id = p.id AND tr.course_id = tc.id
  AND tr.status IN ('completed', 'in_progress', 'not_started')
WHERE (p.status = 'active' OR p.status IS NULL)
  AND tc.is_active = true;

GRANT SELECT ON compliance_matrix_view TO authenticated;
*/

