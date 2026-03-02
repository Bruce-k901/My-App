-- ============================================================================
-- Seed System Review Templates
-- Description: Inserts 11 system review templates (6 performance + 5 disciplinary)
-- ============================================================================

DO $$
BEGIN
  -- Check if review_templates table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'review_templates'
  ) THEN
    RAISE NOTICE 'review_templates table does not exist - skipping seed_review_templates migration';
    RETURN;
  END IF;

  -- Performance & Development Templates

  -- 1. Weekly 1-2-1
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Weekly 1-2-1' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description, 
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Weekly 1-2-1', 'one_to_one',
      'Regular manager check-ins to discuss progress, challenges, and development opportunities.',
      30, 7,
      true, true,
      true, true, 1
    );
  END IF;

  -- 2. Monthly Review
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Monthly Review' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Monthly Review', 'monthly_review',
      'Monthly performance discussion covering achievements, objectives, and development goals.',
      45, 30,
      true, true,
      true, true, 1
    );
  END IF;

  -- 3. 90-Day Probation Review
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = '90-Day Probation Review' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, '90-Day Probation Review', 'probation_review',
      'End of probation assessment to evaluate performance, cultural fit, and confirm employment.',
      60, NULL,
      true, true,
      true, true, 1
    );
  END IF;

  -- 4. Annual Appraisal
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Annual Appraisal' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Annual Appraisal', 'annual_appraisal',
      'Yearly performance review covering achievements, objectives, and development planning.',
      90, 365,
      true, true,
      true, true, 1
    );
  END IF;

  -- 5. Exit Interview
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Exit Interview' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Exit Interview', 'exit_interview',
      'Gather feedback from leaving employees to improve retention and workplace culture.',
      45, NULL,
      true, false,
      true, true, 1
    );
  END IF;

  -- 6. Values & Behavioural Review
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Values & Behavioural Review' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Values & Behavioural Review', 'values_review',
      'Assessment of how well employee demonstrates company values and behavioral competencies.',
      60, NULL,
      true, true,
      true, true, 1
    );
  END IF;

  -- Disciplinary & Grievance Templates

  -- 7. Informal Discussion Record
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Informal Discussion Record' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Informal Discussion Record', 'informal_discussion',
      'First stage disciplinary process - verbal warning and informal discussion of concerns.',
      30, NULL,
      false, true,
      true, true, 1
    );
  END IF;

  -- 8. Investigation Meeting
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Investigation Meeting' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Investigation Meeting', 'investigation_meeting',
      'Fact-finding meeting to gather information before formal disciplinary action.',
      60, NULL,
      false, true,
      true, true, 1
    );
  END IF;

  -- 9. Disciplinary Hearing
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Disciplinary Hearing' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Disciplinary Hearing', 'disciplinary_hearing',
      'Formal disciplinary hearing following ACAS guidelines with panel, evidence, and decision.',
      90, NULL,
      false, true,
      true, true, 1
    );
  END IF;

  -- 10. Appeal Hearing
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Appeal Hearing' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Appeal Hearing', 'appeal_hearing',
      'Appeal against disciplinary decision - review of original decision and grounds for appeal.',
      60, NULL,
      false, true,
      true, true, 1
    );
  END IF;

  -- 11. Grievance Meeting
  IF NOT EXISTS (SELECT 1 FROM review_templates WHERE name = 'Grievance Meeting' AND is_system_template = true) THEN
    INSERT INTO review_templates (
      company_id, name, template_type, description,
      recommended_duration_minutes, recommended_frequency_days,
      requires_self_assessment, requires_manager_assessment,
      is_system_template, is_active, version
    )
    VALUES (
      NULL, 'Grievance Meeting', 'grievance_meeting',
      'Employee complaint procedure - investigation and resolution of workplace grievances.',
      60, NULL,
      true, true,
      true, true, 1
    );
  END IF;
END $$;


