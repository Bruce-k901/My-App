-- =====================================================
-- FIX compliance_matrix_view to use correct column names
-- Previous migrations may have used wrong column names
-- (user_id/completed_date instead of profile_id/completed_at).
-- This recreates the view using the actual column names
-- from the training_records table.
-- =====================================================

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE NOTICE 'Required tables do not exist - skipping view fix';
    RETURN;
  END IF;

  -- Verify column names exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'profile_id'
  ) THEN
    RAISE NOTICE 'profile_id column not found in training_records - skipping';
    RETURN;
  END IF;

  DROP VIEW IF EXISTS compliance_matrix_view CASCADE;

  CREATE OR REPLACE VIEW compliance_matrix_view AS
  SELECT
    p.id as profile_id,
    p.company_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.position_title,
    LOWER(COALESCE(p.app_role::TEXT, '')) as app_role,
    CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site')
      THEN p.home_site
      ELSE NULL
    END as home_site,
    CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
      THEN (SELECT s.name FROM sites s WHERE s.id = p.home_site)
      ELSE NULL
    END as site_name,
    tc.id as course_id,
    tc.name as course_name,
    tc.code as course_code,
    tc.category,
    COALESCE(tc.is_mandatory, false) as is_mandatory,
    tc.mandatory_for_roles,
    -- Training status from training_records
    COALESCE(tr.status, 'not_started') as training_status,
    tr.completed_at,
    tr.expiry_date,
    tr.score_percentage,
    tr.passed,
    tr.certificate_number,
    -- Compliance status logic
    CASE
      WHEN tr.status = 'completed' AND tr.passed IS NOT FALSE
        AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE + INTERVAL '30 days')
      THEN 'compliant'
      WHEN tr.status = 'completed' AND tr.passed IS NOT FALSE
        AND tr.expiry_date IS NOT NULL
        AND tr.expiry_date > CURRENT_DATE
        AND tr.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      THEN 'expiring_soon'
      WHEN tr.status = 'completed' AND tr.passed IS NOT FALSE
        AND tr.expiry_date IS NOT NULL
        AND tr.expiry_date <= CURRENT_DATE
      THEN 'expired'
      WHEN tr.status = 'in_progress' THEN 'in_progress'
      WHEN tc.is_mandatory
        OR (tc.mandatory_for_roles IS NOT NULL
            AND LOWER(COALESCE(p.app_role::TEXT, '')) = ANY(SELECT LOWER(unnest) FROM unnest(tc.mandatory_for_roles)))
      THEN 'required'
      ELSE 'optional'
    END as compliance_status
  FROM profiles p
  INNER JOIN training_courses tc ON tc.company_id = p.company_id AND tc.is_active = true
  LEFT JOIN training_records tr ON tr.profile_id = p.id AND tr.course_id = tc.id
    AND tr.status IN ('completed', 'in_progress', 'not_started')
  WHERE (p.status = 'active' OR p.status IS NULL);

  GRANT SELECT ON compliance_matrix_view TO authenticated;

  -- Also fix training_records_view if it exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'training_records_view') THEN
    DROP VIEW IF EXISTS training_records_view CASCADE;

    CREATE OR REPLACE VIEW training_records_view AS
    SELECT
      tr.id as record_id,
      tr.company_id,
      tr.profile_id,
      tr.course_id,
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
      p.home_site,
      CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
        THEN (SELECT s.name FROM sites s WHERE s.id = p.home_site)
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
        WHEN tr.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN tr.expiry_date <= CURRENT_DATE + COALESCE(tc.renewal_reminder_days, 30) THEN 'expiring_soon'
        ELSE 'valid'
      END as validity_status,
      CASE
        WHEN tr.expiry_date IS NOT NULL THEN tr.expiry_date - CURRENT_DATE
        ELSE NULL
      END as days_until_expiry
    FROM training_records tr
    JOIN profiles p ON p.id = tr.profile_id
    JOIN training_courses tc ON tc.id = tr.course_id;

    GRANT SELECT ON training_records_view TO authenticated;
    RAISE NOTICE 'Fixed training_records_view';
  END IF;

  -- Also fix training_stats_view if it exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'training_stats_view') THEN
    DROP VIEW IF EXISTS training_stats_view CASCADE;

    CREATE OR REPLACE VIEW training_stats_view AS
    SELECT
      tc.company_id,
      tc.id as course_id,
      tc.name as course_name,
      tc.code as course_code,
      tc.category,
      tc.is_mandatory,
      COUNT(DISTINCT p.id) as total_employees,
      COUNT(DISTINCT CASE WHEN tr.status = 'completed' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN tr.profile_id END) as completed_valid,
      COUNT(DISTINCT CASE WHEN tr.status = 'completed' AND tr.expiry_date <= CURRENT_DATE THEN tr.profile_id END) as expired,
      COUNT(DISTINCT CASE WHEN tr.status = 'in_progress' THEN tr.profile_id END) as in_progress,
      COUNT(DISTINCT CASE WHEN tr.status = 'completed' AND tr.expiry_date <= CURRENT_DATE + 30 AND tr.expiry_date > CURRENT_DATE THEN tr.profile_id END) as expiring_30_days,
      ROUND(
        COUNT(DISTINCT CASE WHEN tr.status = 'completed' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN tr.profile_id END)::DECIMAL * 100 /
        NULLIF(COUNT(DISTINCT p.id), 0),
        1
      ) as compliance_percentage
    FROM training_courses tc
    LEFT JOIN profiles p ON p.company_id = tc.company_id AND (p.status = 'active' OR p.status IS NULL)
    LEFT JOIN training_records tr ON tr.course_id = tc.id AND tr.profile_id = p.id
    WHERE tc.is_active = true
    GROUP BY tc.company_id, tc.id, tc.name, tc.code, tc.category, tc.is_mandatory;

    GRANT SELECT ON training_stats_view TO authenticated;
    RAISE NOTICE 'Fixed training_stats_view';
  END IF;

  -- Fix company_training_overview if it exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'company_training_overview') THEN
    DROP VIEW IF EXISTS company_training_overview CASCADE;

    CREATE OR REPLACE VIEW company_training_overview AS
    SELECT
      p.company_id,
      COUNT(DISTINCT p.id) as total_employees,
      COUNT(DISTINCT CASE WHEN NOT EXISTS (
        SELECT 1 FROM training_courses tc
        LEFT JOIN training_records tr ON tr.course_id = tc.id AND tr.profile_id = p.id
        WHERE tc.company_id = p.company_id
          AND tc.is_active = true
          AND tc.is_mandatory = true
          AND (tr.status IS NULL OR tr.status != 'completed' OR (tr.expiry_date IS NOT NULL AND tr.expiry_date <= CURRENT_DATE))
      ) THEN p.id END) as fully_compliant,
      (SELECT COUNT(*) FROM training_records tr2
       WHERE tr2.company_id = p.company_id
         AND tr2.status = 'completed'
         AND tr2.expiry_date IS NOT NULL
         AND tr2.expiry_date <= CURRENT_DATE + 30
         AND tr2.expiry_date > CURRENT_DATE) as expiring_30_days,
      (SELECT COUNT(*) FROM training_records tr3
       WHERE tr3.company_id = p.company_id
         AND tr3.status = 'completed'
         AND tr3.expiry_date IS NOT NULL
         AND tr3.expiry_date <= CURRENT_DATE) as expired_count
    FROM profiles p
    WHERE p.status = 'active' OR p.status IS NULL
    GROUP BY p.company_id;

    GRANT SELECT ON company_training_overview TO authenticated;
    RAISE NOTICE 'Fixed company_training_overview';
  END IF;

  -- Recreate complete_training() function to ensure it uses correct column names
  CREATE OR REPLACE FUNCTION complete_training(
    p_profile_id UUID,
    p_course_id UUID,
    p_completed_at DATE DEFAULT CURRENT_DATE,
    p_score INTEGER DEFAULT NULL,
    p_certificate_number TEXT DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_recorded_by UUID DEFAULT NULL
  )
  RETURNS UUID AS $function$
  DECLARE
    v_record_id UUID;
    v_company_id UUID;
    v_course RECORD;
    v_calc_expiry DATE;
  BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = p_profile_id;
    SELECT * INTO v_course FROM training_courses WHERE id = p_course_id;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    -- Calculate expiry if not provided
    IF p_expiry_date IS NULL AND v_course.certification_validity_months IS NOT NULL THEN
      v_calc_expiry := p_completed_at + (v_course.certification_validity_months || ' months')::INTERVAL;
    ELSE
      v_calc_expiry := p_expiry_date;
    END IF;

    -- Check for existing record (not_started or in_progress)
    SELECT id INTO v_record_id FROM training_records
    WHERE profile_id = p_profile_id AND course_id = p_course_id
      AND status IN ('not_started', 'in_progress');

    IF v_record_id IS NOT NULL THEN
      UPDATE training_records SET
        status = 'completed',
        completed_at = p_completed_at,
        score_percentage = p_score,
        passed = CASE WHEN p_score IS NOT NULL THEN p_score >= COALESCE(v_course.pass_mark_percentage, 70) ELSE true END,
        certificate_number = p_certificate_number,
        issued_date = p_completed_at,
        expiry_date = v_calc_expiry,
        recorded_by = p_recorded_by,
        updated_at = now()
      WHERE id = v_record_id;
    ELSE
      -- Check for existing completed record (upsert)
      SELECT id INTO v_record_id FROM training_records
      WHERE profile_id = p_profile_id AND course_id = p_course_id
        AND status = 'completed';

      IF v_record_id IS NOT NULL THEN
        UPDATE training_records SET
          completed_at = p_completed_at,
          score_percentage = COALESCE(p_score, score_percentage),
          passed = CASE WHEN p_score IS NOT NULL THEN p_score >= COALESCE(v_course.pass_mark_percentage, 70) ELSE COALESCE(passed, true) END,
          certificate_number = COALESCE(p_certificate_number, certificate_number),
          issued_date = p_completed_at,
          expiry_date = v_calc_expiry,
          recorded_by = p_recorded_by,
          updated_at = now()
        WHERE id = v_record_id;
      ELSE
        INSERT INTO training_records (
          company_id, profile_id, course_id, status,
          completed_at, score_percentage, passed,
          certificate_number, issued_date, expiry_date, recorded_by
        ) VALUES (
          v_company_id, p_profile_id, p_course_id, 'completed',
          p_completed_at, p_score,
          CASE WHEN p_score IS NOT NULL THEN p_score >= COALESCE(v_course.pass_mark_percentage, 70) ELSE true END,
          p_certificate_number, p_completed_at, v_calc_expiry, p_recorded_by
        )
        RETURNING id INTO v_record_id;
      END IF;
    END IF;

    RETURN v_record_id;
  END;
  $function$ LANGUAGE plpgsql;

  RAISE NOTICE 'All training views and functions fixed';
END $$;
