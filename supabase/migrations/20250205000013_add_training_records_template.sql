-- ============================================================================
-- Migration: 20250205000012_add_training_records_template.sql
-- Description: Smart training records with user data integration
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Clean up existing template if it exists (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete repeatable labels if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM template_repeatable_labels 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'training_records_review');
    END IF;
    
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM template_fields 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'training_records_review');
    END IF;
    
    -- Delete template
    DELETE FROM task_templates 
    WHERE slug = 'training_records_review';
  END IF;
END $$;

-- Create smart training records template (only if table exists)
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
  'Monthly Training Compliance Review',
  'training_records_review',
  'Review and update staff training records with certificate expiry tracking',
  'compliance',
  'health_safety',
  'monthly',
  'anytime',
  ARRAY['anytime'],
  jsonb_build_object(
    'date_of_month', 1,
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      '📋 REVIEW CURRENT STAFF TRAINING STATUS',
      'Pull staff list from site user database',
      'Check Food Safety certificate expiry dates',
      'Review Health & Safety training compliance', 
      'Verify Allergen Awareness training current',
      'Check First Aid certificate validity',
      'Review Fire Marshal training status',
      'Update any new training completed',
      'Schedule refresher training for expiring certificates',
      'Generate training gap report for management',
      'Update user profile records with new training'
    )
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  TRUE,
  TRUE,
  ARRAY['text_note', 'pass_fail'],
  '🎯 SMART TRAINING COMPLIANCE SYSTEM

This template automatically integrates with your staff user profiles to provide real-time training compliance status.

🔍 HOW IT WORKS:

1. **AUTO-POPULATION**
   • Staff list is pulled from users assigned to this site
   • Current certificate dates are shown from user profiles
   • Expiry warnings highlight certificates due for renewal

2. **COMPLIANCE TRACKING**
   • Green: Certificate valid (> 2 months remaining)
   • Amber: Expiring soon (< 2 months remaining) 
   • Red: Expired or missing training

3. **AUTO-TASK GENERATION**
   • Renewal tasks created for expiring certificates
   • Training schedule updated automatically
   • User profiles updated when training completed

📊 TRAINING MATRIX OVERVIEW:

[This section will auto-populate with staff training status from user profiles]

👤 STAFF MEMBER 1
  ✅ Food Safety L2 - Expires: [date from user profile]
  ⚠️ H&S Induction - Expires: [date from user profile] 
  ✅ First Aid - Expires: [date from user profile]

👤 STAFF MEMBER 2
  ✅ Food Safety L2 - Expires: [date from user profile]
  ✅ H&S Induction - Expires: [date from user profile]
  🚨 Allergen Awareness - EXPIRED: [date from user profile]

🔄 MANUAL UPDATES:

Use the fields below to:
• Record new training sessions completed
• Update certificate expiry dates in user profiles
• Schedule refresher training
• Document any training gaps identified

📞 TRAINING PROVIDERS:
• Food Safety: [Your training provider contacts]
• First Aid: [Your first aid trainer contacts]
• Health & Safety: [Your H&S trainer contacts]',
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
-- TRAINING COMPLIANCE FIELDS
-- ============================================================================
-- Add template fields (only if both tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'review_date', 'date', 'Compliance Review Date', TRUE, 1, 
      'Date when this training compliance review was conducted.'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'review_date');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'reviewed_by', 'text', 'Reviewed By', TRUE, 2,
      'Manager conducting the training compliance review.'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'reviewed_by');

    -- Staff Training Status (Will be auto-populated from user data)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'staff_training_summary', 'text', 'Staff Training Status Summary', TRUE, 10,
      'Auto-populated summary of all staff training status from user profiles. Edit to add notes or observations.',
      'e.g., "3 staff need Food Safety refresher, 1 staff missing Allergen training, all Fire Marshals current..."'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'staff_training_summary');

    -- New Training Records Section
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'new_training_completed', 'text', 'New Training Completed This Month', FALSE, 20,
      'Record any new training sessions completed by staff this month.',
      'e.g., "Sarah completed Fire Marshal training on 15/11, John attended Allergen update on 20/11..."'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'new_training_completed');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'certificate_updates', 'text', 'Certificate Updates Made', FALSE, 21,
      'List any certificate expiry dates updated in user profiles.',
      'e.g., "Updated Mike''s Food Safety expiry to 15/03/2025, Sarah''s First Aid to 22/06/2025..."'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'certificate_updates');

    -- Training Gap Analysis
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'training_gaps_identified', 'text', 'Training Gaps Identified', TRUE, 30,
      'List any training gaps or certificates requiring renewal.',
      'e.g., "2 staff need Food Safety refresher by Jan 2025, 1 staff missing manual handling training..."'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'training_gaps_identified');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT t.id, 'training_priority', 'select', 'Training Priority Level', TRUE, 31,
      'Overall priority for addressing training gaps identified.',
      jsonb_build_array(
        jsonb_build_object('value', 'low', 'label', '🟢 Low Priority - All training current'),
        jsonb_build_object('value', 'medium', 'label', '🟡 Medium - Some refreshers needed within 3 months'),
        jsonb_build_object('value', 'high', 'label', '🟠 High - Multiple certificates expiring soon'),
        jsonb_build_object('value', 'critical', 'label', '🔴 Critical - Expired certificates or legal requirements missing')
      )
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'training_priority');

    -- Follow-up Actions
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'scheduled_refreshers', 'text', 'Scheduled Refresher Training', FALSE, 40,
      'List any refresher training that has been scheduled.',
      'e.g., "Food Safety refresher booked for 15/01/2025, First Aid course scheduled for 22/02/2025..."'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'scheduled_refreshers');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'generate_training_tasks', 'pass_fail', 'Generate Training Tasks', TRUE, 41,
      'YES to automatically create follow-up tasks for required training and certificate renewals.'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'generate_training_tasks');

    -- Overall Compliance
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'compliance_met', 'pass_fail', 'Training Compliance Met', TRUE, 50,
      'PASS if all required training is current or scheduled. FAIL if critical training gaps exist.'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'compliance_met');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'next_review_focus', 'text', 'Next Review Focus Areas', FALSE, 51,
      'Note any specific areas that need attention in the next monthly review.',
      'e.g., "Focus on Fire Marshal renewals, check new staff induction training..."'
    FROM task_templates t
    WHERE t.slug = 'training_records_review'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'next_review_focus');
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
    WHERE slug = 'training_records_review';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id = template_record.id;
    ELSE
      field_count := 0;
    END IF;
  
    IF template_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Training Records Review template created successfully';
      RAISE NOTICE '   Template ID: %', template_record.id;
      RAISE NOTICE '   Features: User data integration + Certificate tracking + Auto-task generation';
      RAISE NOTICE '   Template fields: %', field_count;
      RAISE NOTICE '   ✅ Designed for Phase 1 (auto-population ready)';
      RAISE NOTICE '   ✅ Structured for Phase 2/3 smart features';
      RAISE NOTICE '   ✅ Integration points for user profile data';
      RAISE NOTICE '   ✅ Training gap analysis and prioritization';
    ELSE
      RAISE NOTICE '⚠️ Template not found (may not exist yet)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;



