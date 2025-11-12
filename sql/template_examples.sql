-- ============================================================================
-- Template Examples
-- 
-- Copy and modify these examples to create new templates
-- ============================================================================

-- ============================================================================
-- EXAMPLE 1: Temperature Monitoring Template (with Asset Selection)
-- Features: Temperature logs, Asset selection, Monitor/Callout
-- ============================================================================

INSERT INTO task_templates (
  company_id, name, slug, description, category, audit_category,
  frequency, time_of_day, dayparts, recurrence_pattern,
  assigned_to_role, compliance_standard, is_critical, is_template_library,
  evidence_types, instructions, repeatable_field_name,
  triggers_contractor_on_failure, contractor_type, is_active
) VALUES (
  NULL,
  'Daily Fridge Temperature Check',
  'fridge_temperature_daily',
  'Record temperatures for all fridges to ensure food safety compliance',
  'food_safety',
  'food_safety',
  'daily',
  '09:00',
  ARRAY['before_open', 'during_service'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object(
      'before_open', '07:00',
      'during_service', '14:00'
    )
  ),
  'kitchen_manager',
  'Food Safety Act 1990',
  TRUE,
  TRUE,
  ARRAY['temperature'],              -- Temperature logging feature
  'Check all fridges and record temperatures. If any exceed 4°C, trigger callout.',
  'fridge_name',                     -- Asset selection enabled
  TRUE,                              -- Trigger contractor on failure
  'equipment_repair',                -- Contractor type
  TRUE
);

-- Add temperature field with thresholds
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, warn_threshold, fail_threshold)
SELECT id, 'temperature', 'temperature', 'Temperature (°C)', TRUE, 1, 'Current fridge temperature',
  4,    -- Warn if above 4°C
  8     -- Fail if above 8°C (triggers monitor/callout)
FROM task_templates WHERE slug = 'fridge_temperature_daily';

-- ============================================================================
-- EXAMPLE 2: Checklist + Pass/Fail Template (No Assets)
-- Features: Checklist, Pass/Fail, Monitor/Callout
-- ============================================================================

INSERT INTO task_templates (
  company_id, name, slug, description, category, audit_category,
  frequency, time_of_day, dayparts, recurrence_pattern,
  assigned_to_role, compliance_standard, is_critical, is_template_library,
  evidence_types, instructions, repeatable_field_name,
  triggers_contractor_on_failure, contractor_type, is_active
) VALUES (
  NULL,
  'Weekly Fire Door Inspection',
  'fire_door_inspection_weekly',
  'Weekly inspection of all fire doors for proper operation',
  'fire',
  'fire_safety',
  'weekly',
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'days', ARRAY[1],  -- Monday
    'default_checklist_items', jsonb_build_array(
      'Check door closes properly',
      'Verify door seal is intact',
      'Check emergency release mechanism',
      'Inspect for damage or obstructions',
      'Test door closer operation'
    )
  ),
  'manager',
  'Regulatory Reform (Fire Safety) Order 2005',
  TRUE,
  TRUE,
  ARRAY['text_note', 'pass_fail'],  -- Checklist + Pass/Fail
  'Inspect all fire doors. Mark as Pass if all checks pass, Fail if any issues found.',
  NULL,                              -- NO asset selection
  TRUE,                              -- Trigger contractor on failure
  'fire_safety',                     -- Contractor type
  TRUE
);

-- Add location select field (options in JSONB, not repeatable_labels)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'door_location', 'select', 'Fire Door Location', TRUE, 1, 'Select which fire door is being inspected',
  jsonb_build_array(
    jsonb_build_object('value', 'Main Entrance', 'label', 'Main Entrance'),
    jsonb_build_object('value', 'Kitchen', 'label', 'Kitchen'),
    jsonb_build_object('value', 'Storage', 'label', 'Storage Room'),
    jsonb_build_object('value', 'Stairs', 'label', 'Stairwell')
  )
FROM task_templates WHERE slug = 'fire_door_inspection_weekly';

-- Add pass/fail field
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', TRUE, 10, 'PASS if all checks satisfactory, FAIL if any issues'
FROM task_templates WHERE slug = 'fire_door_inspection_weekly';

-- ============================================================================
-- EXAMPLE 3: Yes/No Checklist Template
-- Features: Yes/No Checklist, Monitor/Callout
-- ============================================================================

INSERT INTO task_templates (
  company_id, name, slug, description, category, audit_category,
  frequency, time_of_day, dayparts, recurrence_pattern,
  assigned_to_role, compliance_standard, is_critical, is_template_library,
  evidence_types, instructions, repeatable_field_name,
  triggers_contractor_on_failure, contractor_type, is_active
) VALUES (
  NULL,
  'Daily Opening Checklist',
  'opening_checklist_daily',
  'Daily pre-opening safety and readiness checks',
  'compliance',
  'operational',
  'daily',
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '08:00')
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  TRUE,
  TRUE,
  ARRAY['yes_no_checklist'],        -- Yes/No checklist (overrides regular checklist)
  'Answer Yes or No for each item. Any "No" answer will trigger monitoring.',
  NULL,                              -- NO asset selection
  FALSE,                             -- No contractor callout (just monitoring)
  NULL,                              -- No contractor type
  TRUE
);

-- ============================================================================
-- EXAMPLE 4: Photo Evidence Template
-- Features: Photo upload, Checklist
-- ============================================================================

INSERT INTO task_templates (
  company_id, name, slug, description, category, audit_category,
  frequency, time_of_day, dayparts, recurrence_pattern,
  assigned_to_role, compliance_standard, is_critical, is_template_library,
  evidence_types, instructions, repeatable_field_name,
  triggers_contractor_on_failure, contractor_type, is_active
) VALUES (
  NULL,
  'Monthly Equipment Condition Check',
  'equipment_condition_monthly',
  'Monthly visual inspection with photos of equipment condition',
  'h_and_s',
  'health_safety',
  'monthly',
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'date_of_month', 1,
    'default_checklist_items', jsonb_build_array(
      'Take photos of equipment from all angles',
      'Check for visible damage',
      'Note any wear or deterioration',
      'Record serial numbers if visible'
    )
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  FALSE,
  TRUE,
  ARRAY['photo', 'text_note'],      -- Photo + Checklist
  'Take photos of equipment condition and complete checklist items.',
  NULL,                              -- NO asset selection
  FALSE,
  NULL,
  TRUE
);

-- Add equipment select field
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'equipment', 'select', 'Equipment', TRUE, 1, 'Select equipment being inspected',
  jsonb_build_array(
    jsonb_build_object('value', 'Oven', 'label', 'Oven'),
    jsonb_build_object('value', 'Fryer', 'label', 'Deep Fryer'),
    jsonb_build_object('value', 'Grill', 'label', 'Grill'),
    jsonb_build_object('value', 'Dishwasher', 'label', 'Dishwasher')
  )
FROM task_templates WHERE slug = 'equipment_condition_monthly';

-- ============================================================================
-- EXAMPLE 5: Complex Template (Multiple Features)
-- Features: Checklist, Pass/Fail, Photo, Monitor/Callout
-- ============================================================================

INSERT INTO task_templates (
  company_id, name, slug, description, category, audit_category,
  frequency, time_of_day, dayparts, recurrence_pattern,
  assigned_to_role, compliance_standard, is_critical, is_template_library,
  evidence_types, instructions, repeatable_field_name,
  triggers_contractor_on_failure, contractor_type, is_active
) VALUES (
  NULL,
  'Monthly Safety Audit',
  'safety_audit_monthly',
  'Comprehensive monthly safety audit with photos and pass/fail assessment',
  'h_and_s',
  'health_safety',
  'monthly',
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'date_of_month', 1,
    'default_checklist_items', jsonb_build_array(
      'Check fire exits are clear',
      'Verify emergency lighting works',
      'Check first aid kit is complete',
      'Inspect fire extinguishers',
      'Verify safety signage is visible'
    )
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  TRUE,
  TRUE,
  ARRAY['text_note', 'pass_fail', 'photo'],  -- Checklist + Pass/Fail + Photo
  'Complete all checklist items, take photos of issues, and provide overall pass/fail assessment.',
  NULL,                              -- NO asset selection
  TRUE,                              -- Trigger contractor on failure
  'fire_safety',                     -- Contractor type
  TRUE
);

-- Add assessment field
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_assessment', 'pass_fail', 'Overall Safety Assessment', TRUE, 20, 'PASS if all checks satisfactory, FAIL if any issues found'
FROM task_templates WHERE slug = 'safety_audit_monthly';

