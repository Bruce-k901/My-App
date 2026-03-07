-- First, create the training_stats_view using just training_courses (no training_records join for now)
CREATE OR REPLACE VIEW training_stats_view AS
SELECT 
  tc.company_id,
  tc.id as course_id,
  tc.name as course_name,
  tc.code as course_code,
  tc.category,
  tc.is_mandatory,
  COUNT(DISTINCT p.id) as total_employees,
  0 as completed_valid,
  0 as expired,
  0 as in_progress,
  0 as expiring_30_days,
  0.0 as compliance_percentage
FROM training_courses tc
LEFT JOIN profiles p ON p.company_id = tc.company_id AND (p.status = 'active' OR p.status IS NULL)
WHERE tc.is_active = true
GROUP BY tc.company_id, tc.id, tc.name, tc.code, tc.category, tc.is_mandatory;

GRANT SELECT ON training_stats_view TO authenticated;

-- Now add Health and Safety Level 2 course to all existing companies
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    INSERT INTO training_courses (
      company_id, name, code, description, category, course_type,
      results_in_certification, certification_name, certification_validity_months,
      is_mandatory, renewal_required, renewal_period_months, renewal_reminder_days,
      duration_minutes, sort_order
    ) VALUES (
      company_record.id, 'Health and Safety Level 2', 'HS-L2',
      'Comprehensive workplace safety course covering risk assessment, fire safety, manual handling, and kitchen-specific hazards',
      'Health & Safety', 'online',
      true, 'Health and Safety Level 2 Certificate', 36,
      true, true, 36, 60,
      240, 2.5
    ) ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;
