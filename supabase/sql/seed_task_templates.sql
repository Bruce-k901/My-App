-- Seed Task Templates - Detailed Implementation
-- 18 compliance task templates with proper fields and repeatable labels

-- Clear existing data (for re-seeding)
TRUNCATE TABLE public.task_repeatable_labels CASCADE;
TRUNCATE TABLE public.task_fields CASCADE;
TRUNCATE TABLE public.task_templates CASCADE;

-- ============================================================================
-- FOOD SAFETY TEMPLATES (6)
-- ============================================================================

-- FS-001: Fridge & Freezer Temperature Check - Cold Hold
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, repeatable_field_name,
  is_critical, is_template_library, is_active
) VALUES (
  'FS-001: Fridge & Freezer Temperature Check - Cold Hold',
  'fs001_fridge_temp_cold_hold',
  'Monitor cold hold temperatures for food safety compliance. Check all refrigeration units daily.',
  'food_safety',
  'daily',
  ARRAY['before_open', 'during_service', 'afternoon'],
  'kitchen_manager',
  'Food Safety Act / HACCP',
  'food_safety',
  ARRAY['temperature', 'photo', 'pass_fail'],
  'fridge_name',
  false,
  true,
  true
) RETURNING id INTO TEMP fs001_id;

-- Fields for FS-001
INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order, help_text)
SELECT id, 'fridge_name', 'Fridge Name', 'select', true, 1, 'Select the unit being checked'
FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, min_value, max_value, display_order, help_text)
SELECT id, 'temperature', 'Temperature (°C)', 'temperature', true, -20, 10, 2, 'Cold hold must be between 0-8°C'
FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'status', 'Status', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'initials', 'Initials', 'text', true, 4
FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'photo', 'Photo Evidence', 'photo', false, 5
FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold';

-- Repeatable labels for FS-001
INSERT INTO public.task_repeatable_labels (task_template_id, label_text, display_order)
SELECT id, 'Walk-in Chiller', 1 FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold'
UNION ALL
SELECT id, 'Display Fridge A', 2 FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold'
UNION ALL
SELECT id, 'Display Fridge B', 3 FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold'
UNION ALL
SELECT id, 'Freezer 1', 4 FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold'
UNION ALL
SELECT id, 'Reach-in Freezer', 5 FROM task_templates WHERE slug = 'fs001_fridge_temp_cold_hold';

-- FS-002: Hot Hold Temperature Check - Cook Line
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, repeatable_field_name,
  is_critical, is_template_library, is_active
) VALUES (
  'FS-002: Hot Hold Temperature Check - Cook Line',
  'fs002_hot_hold_temp',
  'Monitor hot holding temperatures to ensure food stays above safe temperatures.',
  'food_safety',
  'daily',
  ARRAY['before_open', 'during_service'],
  'kitchen_manager',
  'Cook Safe',
  'food_safety',
  ARRAY['temperature', 'pass_fail'],
  'hot_hold_unit_name',
  false,
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'hot_hold_unit_name', 'Hot Hold Unit', 'select', true, 1
FROM task_templates WHERE slug = 'fs002_hot_hold_temp';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, min_value, max_value, display_order, help_text)
SELECT id, 'temperature', 'Temperature (°C)', 'temperature', true, 50, 75, 2, 'Hot hold must be above 63°C'
FROM task_templates WHERE slug = 'fs002_hot_hold_temp';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'status', 'Status', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'fs002_hot_hold_temp';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'initials', 'Initials', 'text', true, 4
FROM task_templates WHERE slug = 'fs002_hot_hold_temp';

INSERT INTO public.task_repeatable_labels (task_template_id, label_text, display_order)
SELECT id, 'Hot Hold A (Sauces)', 1 FROM task_templates WHERE slug = 'fs002_hot_hold_temp'
UNION ALL
SELECT id, 'Hot Hold B (Proteins)', 2 FROM task_templates WHERE slug = 'fs002_hot_hold_temp'
UNION ALL
SELECT id, 'Bain-Marie (Veg)', 3 FROM task_templates WHERE slug = 'fs002_hot_hold_temp';

-- FS-003: Allergen Board Update & Verification
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, is_critical,
  is_template_library, is_active
) VALUES (
  'FS-003: Allergen Board Update & Verification',
  'fs003_allergen_board',
  'Verify allergen information is current and displayed correctly per Natasha''s Law.',
  'food_safety',
  'daily',
  ARRAY['before_open'],
  'manager',
  'Natasha''s Law',
  'allergen',
  ARRAY['photo', 'text_note', 'pass_fail'],
  true,
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'allergen_board_checked', 'Allergen Board Checked', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'fs003_allergen_board';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'new_items_added', 'New Items Added', 'text', false, 2
FROM task_templates WHERE slug = 'fs003_allergen_board';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'photo_evidence', 'Photo Evidence', 'photo', true, 3
FROM task_templates WHERE slug = 'fs003_allergen_board';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'checked_by_initials', 'Checked By (Initials)', 'text', true, 4
FROM task_templates WHERE slug = 'fs003_allergen_board';

-- FS-004: Stock Rotation & FIFO Check
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'FS-004: Stock Rotation & FIFO Check',
  'fs004_stock_rotation',
  'Verify proper stock rotation using FIFO (First In, First Out) method.',
  'food_safety',
  'daily',
  ARRAY['before_open', 'after_service'],
  'kitchen_porter',
  'Food Safety Act',
  'food_safety',
  ARRAY['pass_fail', 'text_note'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'walk_in_fridge_checked', 'Walk-in Fridge Checked', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'fs004_stock_rotation';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'dry_store_checked', 'Dry Store Checked', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'fs004_stock_rotation';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'freezer_checked', 'Freezer Checked', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'fs004_stock_rotation';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'stock_rotated', 'Stock Rotated', 'text', false, 4
FROM task_templates WHERE slug = 'fs004_stock_rotation';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'issues_found', 'Issues Found', 'text', false, 5
FROM task_templates WHERE slug = 'fs004_stock_rotation';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'initials', 'Initials', 'text', true, 6
FROM task_templates WHERE slug = 'fs004_stock_rotation';

-- FS-005: Delivery Acceptance Check
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'FS-005: Delivery Acceptance Check',
  'fs005_delivery_check',
  'Verify incoming deliveries meet food safety standards before acceptance.',
  'food_safety',
  'triggered',
  ARRAY['anytime'],
  'chef',
  'Food Safety Act',
  'food_safety',
  ARRAY['text_note', 'pass_fail', 'photo'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'delivery_date', 'Delivery Date', 'date', true, 1
FROM task_templates WHERE slug = 'fs005_delivery_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'supplier_name', 'Supplier Name', 'text', true, 2
FROM task_templates WHERE slug = 'fs005_delivery_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'vehicle_temp_ok', 'Vehicle Temperature OK', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'fs005_delivery_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'goods_in_date', 'Goods In Date', 'pass_fail', true, 4
FROM task_templates WHERE slug = 'fs005_delivery_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'packaging_intact', 'Packaging Intact', 'pass_fail', true, 5
FROM task_templates WHERE slug = 'fs005_delivery_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'chilled_items_cold', 'Chilled Items Cold', 'pass_fail', true, 6
FROM task_templates WHERE slug = 'fs005_delivery_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'overall_status', 'Overall Status', 'pass_fail', true, 7
FROM task_templates WHERE slug = 'fs005_delivery_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'checked_by_initials', 'Checked By (Initials)', 'text', true, 8
FROM task_templates WHERE slug = 'fs005_delivery_check';

-- FS-006: Daily Deep Clean Checklist - Food Prep Area
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'FS-006: Daily Deep Clean Checklist - Food Prep Area',
  'fs006_daily_deep_clean',
  'Verify comprehensive cleaning of food prep areas.',
  'food_safety',
  'daily',
  ARRAY['before_open', 'after_service'],
  'chef',
  'HACCP',
  'food_safety',
  ARRAY['pass_fail'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'prep_surfaces_sanitized', 'Prep Surfaces Sanitized', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'fs006_daily_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'cutting_boards_sanitized', 'Cutting Boards Sanitized', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'fs006_daily_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'sinks_clean', 'Sinks Clean', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'fs006_daily_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'hand_wash_station_stocked', 'Hand Wash Station Stocked', 'pass_fail', true, 4
FROM task_templates WHERE slug = 'fs006_daily_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'cleaned_by_initials', 'Cleaned By (Initials)', 'text', true, 5
FROM task_templates WHERE slug = 'fs006_daily_deep_clean';

-- ============================================================================
-- HEALTH & SAFETY TEMPLATES (3)
-- ============================================================================

-- HS-001: Pre-Opening Safety Walkthrough
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, is_critical,
  is_template_library, is_active
) VALUES (
  'HS-001: Pre-Opening Safety Walkthrough',
  'hs001_pre_opening_safety',
  'Comprehensive safety check before opening to the public.',
  'h_and_s',
  'daily',
  ARRAY['before_open'],
  'duty_manager',
  'Health & Safety at Work Act',
  'h_and_s',
  ARRAY['pass_fail', 'photo'],
  true,
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'floor_hazards_checked', 'Floor Hazards Checked', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'hs001_pre_opening_safety';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'staff_health_ok', 'Staff Health OK', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'hs001_pre_opening_safety';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'equipment_damage_checked', 'Equipment Damage Checked', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'hs001_pre_opening_safety';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'exits_clear', 'Exits Clear', 'pass_fail', true, 4
FROM task_templates WHERE slug = 'hs001_pre_opening_safety';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'first_aid_kit_stocked', 'First Aid Kit Stocked', 'pass_fail', true, 5
FROM task_templates WHERE slug = 'hs001_pre_opening_safety';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'issues_found', 'Issues Found', 'text', false, 6
FROM task_templates WHERE slug = 'hs001_pre_opening_safety';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'manager_initials', 'Manager Initials', 'text', true, 7
FROM task_templates WHERE slug = 'hs001_pre_opening_safety';

-- HS-002: Incident & Accident Report
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, is_critical,
  is_template_library, is_active
) VALUES (
  'HS-002: Incident & Accident Report',
  'hs002_incident_report',
  'Report incidents, accidents, and near misses for RIDDOR compliance.',
  'h_and_s',
  'triggered',
  ARRAY['anytime'],
  'any_staff',
  'RIDDOR',
  'h_and_s',
  ARRAY['text_note', 'photo', 'signature'],
  true,
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'incident_date', 'Incident Date', 'date', true, 1
FROM task_templates WHERE slug = 'hs002_incident_report';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'incident_time', 'Incident Time', 'text', true, 2
FROM task_templates WHERE slug = 'hs002_incident_report';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'involved_person_name', 'Involved Person Name', 'text', true, 3
FROM task_templates WHERE slug = 'hs002_incident_report';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, options, display_order, help_text)
SELECT id, 'incident_type', 'Incident Type', 'select', true, 
  '[{"value": "injury", "label": "Injury"}, {"value": "near_miss", "label": "Near Miss"}, {"value": "accident", "label": "Accident"}, {"value": "property_damage", "label": "Property Damage"}]'::jsonb,
  4, 'Select the type of incident'
FROM task_templates WHERE slug = 'hs002_incident_report';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order, help_text)
SELECT id, 'description', 'Description', 'text', true, 5, 'Detailed account of what happened'
FROM task_templates WHERE slug = 'hs002_incident_report';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'witnesses', 'Witnesses', 'text', false, 6
FROM task_templates WHERE slug = 'hs002_incident_report';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'action_taken', 'Action Taken', 'text', false, 7
FROM task_templates WHERE slug = 'hs002_incident_report';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'reported_by_initials', 'Reported By (Initials)', 'text', true, 8
FROM task_templates WHERE slug = 'hs002_incident_report';

-- HS-003: Manual Handling / Equipment Use Safety Check
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'HS-003: Manual Handling / Equipment Use Safety Check',
  'hs003_manual_handling',
  'Verify safe manual handling and equipment usage practices.',
  'h_and_s',
  'weekly',
  ARRAY['anytime'],
  'duty_manager',
  'Manual Handling Regulations',
  'h_and_s',
  ARRAY['pass_fail', 'text_note'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'lifting_techniques_observed', 'Lifting Techniques Observed', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'hs003_manual_handling';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'heavy_items_stored_correctly', 'Heavy Items Stored Correctly', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'hs003_manual_handling';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'equipment_being_used_safely', 'Equipment Being Used Safely', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'hs003_manual_handling';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'staff_training_needed', 'Staff Training Needed', 'text', false, 4
FROM task_templates WHERE slug = 'hs003_manual_handling';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'manager_initials', 'Manager Initials', 'text', true, 5
FROM task_templates WHERE slug = 'hs003_manual_handling';

-- ============================================================================
-- FIRE & SECURITY TEMPLATES (3)
-- I'll continue with the remaining templates in the next part...

-- Add comments
COMMENT ON TABLE public.task_templates IS '18 compliance task templates covering food safety, H&S, fire, and cleaning requirements';
