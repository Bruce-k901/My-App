-- ============================================================================
-- Migration: 20250207000002_add_training_compliance_task.sql
-- Description: Smart training compliance task using matrix data
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Clean up existing template if it exists (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete repeatable labels if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM template_repeatable_labels
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'training_compliance_management');
    END IF;
    
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM template_fields
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'training_compliance_management');
    END IF;
    
    -- Delete template
    DELETE FROM task_templates
    WHERE slug = 'training_compliance_management';
  END IF;
END $$;

-- Create smart training compliance task template (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    INSERT INTO task_templates (
  company_id,
  name,
  slug,
  description,
  category,
  audit_category,
  frequency,
  time_of_day,
  dayparts,
  recurrence_pattern,
  assigned_to_role,
  compliance_standard,
  is_critical,
  is_template_library,
  evidence_types,
  instructions,
  repeatable_field_name,
  triggers_contractor_on_failure,
  contractor_type,
  is_active,
  requires_sop,
  requires_risk_assessment
) VALUES (
  NULL,
  'Training Compliance Management',
  'training_compliance_management',
  'Manage staff training compliance using live matrix data',
  'compliance',
  'health_safety',
  'monthly',
  'anytime',
  ARRAY['anytime'],
  jsonb_build_object(
    'date_of_month', 1,
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'Open the live Training Matrix and review current status',
      'Summarise expiring certificates (<60 days) and mandatory gaps',
      'Confirm specialist coverage (First Aiders / Fire Marshals)',
      'Log refresher or new training bookings required',
      'Create follow-up tasks for outstanding actions',
      'Record evidence and confirm full compliance before closing'
    )
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  TRUE,
  TRUE,
  ARRAY['text_note', 'pass_fail', 'repeatable_record'],
  '🎯 SMART TRAINING COMPLIANCE MANAGEMENT

This task uses live matrix data to keep staff training compliant. Keep this checklist concise by working directly from the matrix.

🔍 LIVE DATA:
• Open the live Training Matrix (link below) to review status.
• Focus on certificates expiring within 60 days and mandatory gaps.
• Confirm First Aider / Fire Marshal coverage meets legal minimums.

🔄 WORKFLOW:
1. Open the Training Matrix and review current status.
2. Summarise key risks (expiring certs, missing training).
3. Confirm specialist coverage; note actions if coverage is short.
4. Create bookings or refresher sessions where gaps exist.
5. Generate/track follow-up tasks (e.g. refreshers, profile updates).
6. Record evidence and confirm full compliance to close the task.

📞 PROVIDERS: Add your preferred contacts for First Aid, Fire Safety, Food Safety, and General H&S.',
  NULL,
  FALSE,
  NULL,
  TRUE,
      FALSE,
      FALSE
    );
  END IF;
END $$;

-- ============================================================================
-- TRAINING MATRIX LINK + STATUS OVERVIEW
-- ============================================================================
-- Add template fields (only if both tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'matrix_link', 'text', 'Open Live Training Matrix', TRUE, 1,
      'Click the button below to open the live Training Matrix in a new tab. Paste the URL you opened for audit trail.',
      '/dashboard/training'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'matrix_link');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'matrix_summary', 'text', 'Training Matrix Summary', TRUE, 2,
      'Summarise key points after reviewing the matrix (expiring certs, mandatory gaps, overall risk).',
      'e.g., "15 staff total, 3 Food Safety certs expiring soon, 2 First Aiders current, 1 Fire Marshal gap on late shift"'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'matrix_summary');

    -- ============================================================================
    -- EXPIRING CERTIFICATES & MANDATORY GAPS
    -- ============================================================================

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'expiring_certificates', 'text', 'Certificates Expiring Within 2 Months', TRUE, 10,
      'List all certificates that will expire within the next 2 months. Auto-populated from matrix.',
      'e.g., "John Smith - Food Safety L2 (15/01/2025), Sarah Brown - First Aid (22/01/2025), Mike Wilson - H&S Induction (08/02/2025)"'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'expiring_certificates');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'missing_mandatory_training', 'text', 'Missing Mandatory Training', TRUE, 11,
      'Identify any staff missing legally required training.',
      'e.g., "2 new staff missing H&S Induction, 1 staff missing Allergen Awareness, 3 staff need Fire Safety refresher"'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'missing_mandatory_training');

    -- ============================================================================
    -- SPECIALIST ROLE COVERAGE (COMBINED)
    -- ============================================================================

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'specialist_coverage_ok', 'pass_fail', 'Specialist Coverage Adequate', TRUE, 20,
      'PASS if First Aiders and Fire Marshals meet coverage requirements; FAIL if additional training or coverage is needed.'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'specialist_coverage_ok');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'specialist_coverage_notes', 'text', 'Specialist Coverage Notes', TRUE, 21,
      'Summarise current First Aider / Fire Marshal coverage, gaps, and planned actions.',
      'e.g., "Currently 2 First Aiders for 45 staff (meets requirement). Fire Marshal coverage short on late shift – refresher booked for Sarah (15/03/2025)."'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'specialist_coverage_notes');

    -- ============================================================================
    -- TRAINING BOOKINGS & TRIGGERS
    -- ============================================================================

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'training_booking_triggers', 'repeatable_record', 'Training Booking Triggers', FALSE, 30,
      'Optional: list each person flagged for refresher/new training and the action taken (auto or manual entry).'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'training_booking_triggers');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'training_bookings', 'text', 'Training Courses Booked', TRUE, 31,
      'Record the sessions booked (refresher or new) and dates.',
      'e.g., "Food Safety refresher booked for 3 staff on 15/01/2025, New First Aider course booked for 22/02/2025, Fire Marshal refresher scheduled for 08/03/2025"'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'training_bookings');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT t.id, 'training_urgency', 'select', 'Training Urgency Level', TRUE, 32,
      'Overall urgency for addressing training gaps.',
      jsonb_build_array(
        jsonb_build_object('value', 'routine', 'label', '🟢 Routine - Plan within 3 months'),
        jsonb_build_object('value', 'priority', 'label', '🟡 Priority - Schedule within 4 weeks'),
        jsonb_build_object('value', 'urgent', 'label', '🟠 Urgent - Book within 2 weeks'),
        jsonb_build_object('value', 'critical', 'label', '🔴 Critical - Immediate booking required')
      )
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'training_urgency');

    -- ============================================================================
    -- FOLLOW-UP TASK GENERATION
    -- ============================================================================

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'follow_up_tasks_created', 'text', 'Follow-up Tasks Created', TRUE, 40,
      'List the follow-up tasks generated to ensure training completion.',
      'e.g., "Task: Verify Food Safety training attendance, Task: Update user profiles with new certificates, Task: Confirm First Aider coverage met"'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'follow_up_tasks_created');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'generate_follow_ups', 'pass_fail', 'Generate Follow-up Tasks', TRUE, 41,
      'YES to automatically create follow-up tasks for training verification and compliance checking.'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'generate_follow_ups');

    -- ============================================================================
    -- COMPLIANCE VERIFICATION
    -- ============================================================================

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'full_compliance_achieved', 'pass_fail', 'Full Training Compliance Achieved', TRUE, 50,
      'PASS when all training gaps are addressed, certificates current, and specialist coverage meets requirements. FAIL if any compliance issues remain.'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'full_compliance_achieved');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'compliance_evidence', 'text', 'Compliance Evidence', TRUE, 51,
      'Document evidence that full compliance has been achieved.',
      'e.g., "All expiring certificates renewed, training matrix updated, First Aider coverage confirmed adequate, Fire Marshal roster complete, all mandatory training completed"'
    FROM task_templates t
    WHERE t.slug = 'training_compliance_management'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'compliance_evidence');
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verification (only if tables exist)
DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT * INTO template_record
    FROM task_templates
    WHERE slug = 'training_compliance_management';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id = template_record.id;
    ELSE
      field_count := 0;
    END IF;

    IF template_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Training Compliance Management template created successfully';
      RAISE NOTICE '   Template ID: %', template_record.id;
      RAISE NOTICE '   Features: Matrix integration + Specialist coverage + Auto follow-up tasks';
      RAISE NOTICE '   Template fields: %', field_count;
      RAISE NOTICE '   ✅ First Aider coverage analysis';
      RAISE NOTICE '   ✅ Fire Marshal coverage verification';
      RAISE NOTICE '   ✅ Training gap identification and booking';
      RAISE NOTICE '   ✅ Follow-up task generation for completion tracking';
      RAISE NOTICE '   ✅ Full compliance verification system';
    ELSE
      RAISE NOTICE '⚠️ Template not found (may not exist yet)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;


