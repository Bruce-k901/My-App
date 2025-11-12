-- ============================================================================
-- Migration: 20250205000008_add_lighting_inspection_template.sql
-- Description: Simple weekly lighting inspection - check bulbs, call electrician if needed
-- ============================================================================

-- Clean up existing template if it exists
DELETE FROM template_repeatable_labels 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'lighting_inspection');

DELETE FROM template_fields 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'lighting_inspection');

DELETE FROM task_templates 
WHERE slug = 'lighting_inspection';

-- Create simple template
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
  is_active
) VALUES (
  NULL,
  'Weekly Lighting Inspection',
  'lighting_inspection',
  'Check all lighting is operational and replace bulbs where safe',
  'h_and_s',  -- FIXED: Changed from 'health_safety' to 'h_and_s' to match schema constraint
  'health_safety',  -- audit_category can be 'health_safety' for reporting
  'weekly',
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'days', ARRAY[1],  -- Monday
    'default_checklist_items', jsonb_build_array(
      'Kitchen main lighting - all working',
      'Food prep areas - adequate lighting',
      'Storage rooms - lights functional', 
      'Staff areas - all bulbs working',
      'Customer areas - no faulty lights',
      'Entrance/external - security lighting',
      'Emergency exits - clearly lit',
      'Replace any accessible faulty bulbs',
      'Reset tripped circuit breakers if safe'
    ),
    -- Add visibility windows for weekly tasks (default: 2 days before, 3 days after)
    'visibility_window_days_before', 2,
    'visibility_window_days_after', 3,
    'grace_period_days', 1  -- Becomes overdue after 1 day past due
  ),
  'manager',
  'Workplace (Health, Safety and Welfare) Regulations 1992',
  FALSE,  -- Not critical (can wait for electrician)
  TRUE,
  ARRAY['text_note', 'pass_fail'],  -- Simple checklist + overall assessment
  'Purpose:
Ensure all lighting is operational for safety and productivity

Importance:
Proper lighting prevents accidents and supports food safety checks

Method:
Check all areas for faulty lighting; replace bulbs where safe; report electrical issues

Special Requirements:
Only replace bulbs if safe to do so; call electrician for any electrical faults',
  NULL,  -- No asset selection
  TRUE,  -- Trigger electrician callout if needed
  'electrical',
  TRUE
);

-- Add template fields
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1, 
  'Date when lighting inspection was performed.'
FROM task_templates WHERE slug = 'lighting_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'inspected_by', 'text', 'Inspected By', TRUE, 2,
  'Name of person who performed the inspection.'
FROM task_templates WHERE slug = 'lighting_inspection';

-- Overall assessment (triggers callout if "Fail")
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'all_lighting_ok', 'pass_fail', 'All Lighting Operational', TRUE, 20,
  'PASS if all lighting is working or bulbs replaced. FAIL if electrical issues found - will trigger electrician callout.'
FROM task_templates WHERE slug = 'lighting_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'action_notes', 'text', 'Actions Taken / Notes', FALSE, 21,
  'Record any bulbs replaced, issues found, or electrician requirements.',
  'e.g., Replaced 3 bulbs in kitchen, flickering lights in storage room, electrician needed for wiring issue...'
FROM task_templates WHERE slug = 'lighting_inspection';

-- Verification
DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  SELECT * INTO template_record
  FROM task_templates 
  WHERE slug = 'lighting_inspection';
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id = template_record.id;
  
  IF template_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Lighting Inspection template created successfully';
    RAISE NOTICE '   Template ID: %', template_record.id;
    RAISE NOTICE '   Category: %', template_record.category;
    RAISE NOTICE '   Evidence types: %', template_record.evidence_types;
    RAISE NOTICE '   Triggers contractor: %', template_record.triggers_contractor_on_failure;
    RAISE NOTICE '   Contractor type: %', template_record.contractor_type;
    RAISE NOTICE '   Template fields: %', field_count;
    RAISE NOTICE '   ✓ Features: Checklist (9 items) + Pass/Fail + Electrician callout on failure';
    
    -- Check visibility windows
    IF template_record.recurrence_pattern IS NOT NULL AND 
       template_record.recurrence_pattern ? 'visibility_window_days_before' THEN
      RAISE NOTICE '   ✓ Visibility window: % days before, % days after',
        template_record.recurrence_pattern->>'visibility_window_days_before',
        template_record.recurrence_pattern->>'visibility_window_days_after';
      RAISE NOTICE '   ✓ Grace period: % days',
        template_record.recurrence_pattern->>'grace_period_days';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Template creation may have failed. Template not found.';
  END IF;
END $$;

