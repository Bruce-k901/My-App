-- =====================================================
-- TRAINING EXPIRY ALERTS
-- For cron jobs and notifications
-- =====================================================

-- Get all training that needs renewal reminders
CREATE OR REPLACE FUNCTION get_training_requiring_renewal_reminder(p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  record_id UUID,
  profile_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  course_id UUID,
  course_name TEXT,
  course_code TEXT,
  expiry_date DATE,
  days_until_expiry INTEGER,
  manager_id UUID,
  manager_name TEXT,
  manager_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.profile_id,
    p.full_name,
    p.email,
    tc.id,
    tc.name,
    tc.code,
    tr.expiry_date,
    (tr.expiry_date - CURRENT_DATE)::INTEGER,
    m.id,
    m.full_name,
    m.email
  FROM training_records tr
  JOIN profiles p ON p.id = tr.profile_id
  JOIN training_courses tc ON tc.id = tr.course_id
  LEFT JOIN profiles m ON m.id = p.reports_to
  WHERE (p_company_id IS NULL OR tr.company_id = p_company_id)
    AND tr.status = 'completed'
    AND tr.expiry_date IS NOT NULL
    AND tr.expiry_date <= CURRENT_DATE + COALESCE(tc.renewal_reminder_days, 30)
    AND tr.expiry_date > CURRENT_DATE
    AND (tr.renewal_reminder_sent = false OR tr.renewal_reminder_sent IS NULL)
    AND tc.renewal_required = true;
END;
$$ LANGUAGE plpgsql;

-- Mark reminder as sent
CREATE OR REPLACE FUNCTION mark_renewal_reminder_sent(p_record_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE training_records
  SET 
    renewal_reminder_sent = true,
    renewal_reminder_sent_at = now()
  WHERE id = ANY(p_record_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Auto-expire old training
CREATE OR REPLACE FUNCTION auto_expire_training()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE training_records
  SET 
    status = 'expired',
    updated_at = now()
  WHERE status = 'completed'
    AND expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- QUICK COMPLIANCE CHECK
-- For dashboard widgets
-- =====================================================

CREATE OR REPLACE FUNCTION get_compliance_summary(p_company_id UUID)
RETURNS TABLE (
  category TEXT,
  total_required INTEGER,
  compliant INTEGER,
  expired INTEGER,
  missing INTEGER,
  compliance_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH requirements AS (
    SELECT 
      tc.category,
      p.id as profile_id,
      tc.id as course_id,
      CASE 
        WHEN tr.status = 'completed' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN 'compliant'
        WHEN tr.status = 'completed' AND tr.expiry_date <= CURRENT_DATE THEN 'expired'
        ELSE 'missing'
      END as status
    FROM profiles p
    CROSS JOIN training_courses tc
    LEFT JOIN training_records tr ON tr.profile_id = p.id AND tr.course_id = tc.id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND tc.company_id = p_company_id
      AND tc.is_active = true
      AND tc.is_mandatory = true
  )
  SELECT 
    r.category,
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE r.status = 'compliant')::INTEGER,
    COUNT(*) FILTER (WHERE r.status = 'expired')::INTEGER,
    COUNT(*) FILTER (WHERE r.status = 'missing')::INTEGER,
    ROUND(COUNT(*) FILTER (WHERE r.status = 'compliant')::DECIMAL * 100 / NULLIF(COUNT(*), 0), 1)
  FROM requirements r
  GROUP BY r.category
  ORDER BY r.category;
END;
$$ LANGUAGE plpgsql;

