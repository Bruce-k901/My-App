-- Task Templates Query Patterns - UPDATED FOR DEV BRIEF
-- Sample queries using CORRECT table names: template_fields, checklist_tasks, task_completion_records
-- Run these after applying migrations to verify everything works

-- ============================================================================
-- QUERY 1: List all food safety templates (library only)
-- Use Case: Show templates in template browser
-- Expected: 6 templates
-- ============================================================================
SELECT 
  id, 
  name, 
  slug,
  frequency, 
  dayparts,
  compliance_standard,
  is_critical,
  triggers_contractor_on_failure
FROM task_templates 
WHERE category = 'food_safety' 
  AND is_template_library = true 
  AND is_active = true
ORDER BY name;

-- ============================================================================
-- QUERY 2: Get full template with fields (for editing UI)
-- Use Case: Load template for editing or cloning
-- Expected: Single template with all fields as JSON array
-- ============================================================================
SELECT 
  t.*,
  json_agg(
    json_build_object(
      'id', f.id, 
      'field_name', f.field_name,
      'field_type', f.field_type,
      'label', f.label, 
      'required', f.required,
      'min_value', f.min_value,
      'max_value', f.max_value,
      'warn_threshold', f.warn_threshold,
      'fail_threshold', f.fail_threshold,
      'field_order', f.field_order,
      'help_text', f.help_text
    ) ORDER BY f.field_order
  ) FILTER (WHERE f.id IS NOT NULL) as fields,
  json_agg(
    json_build_object(
      'id', rl.id,
      'label', rl.label,
      'label_value', rl.label_value,
      'is_default', rl.is_default,
      'display_order', rl.display_order
    ) ORDER BY rl.display_order
  ) FILTER (WHERE rl.id IS NOT NULL) as repeatable_labels
FROM task_templates t
LEFT JOIN template_fields f ON t.id = f.template_id
LEFT JOIN template_repeatable_labels rl ON t.id = rl.template_id
WHERE t.slug = 'fridge_temps_cold_hold'
GROUP BY t.id;

-- ============================================================================
-- QUERY 3: Generate today's tasks (what would the midnight cron produce?)
-- Use Case: Dashboard showing today's tasks
-- Expected: Templates scheduled for today based on frequency
-- ============================================================================
SELECT 
  t.id, 
  t.name, 
  t.frequency, 
  t.dayparts,
  t.assigned_to_role,
  CURRENT_DATE as due_date,
  CURRENT_TIME as due_time
FROM task_templates t
WHERE t.frequency = 'daily' 
  AND t.is_active = true
  AND t.is_template_library = true
ORDER BY t.category, t.name;

-- ============================================================================
-- QUERY 4: Compliance report - food safety completions this month
-- Use Case: Compliance dashboard showing completion rates
-- Expected: Completion rates per template for current month
-- ============================================================================
SELECT 
  t.name,
  t.compliance_standard,
  COUNT(ct.id) as total_tasks,
  COUNT(CASE WHEN ct.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN ct.status = 'overdue' THEN 1 END) as overdue,
  COUNT(CASE WHEN ct.status = 'failed' THEN 1 END) as failed,
  ROUND(100.0 * COUNT(CASE WHEN ct.status = 'completed' THEN 1 END) / NULLIF(COUNT(ct.id), 0), 1) as completion_rate
FROM task_templates t
LEFT JOIN checklist_tasks ct ON t.id = ct.template_id
WHERE t.audit_category = 'food_safety'
  AND t.is_template_library = true
  AND (ct.due_date >= DATE_TRUNC('month', CURRENT_DATE) OR ct.id IS NULL)
GROUP BY t.id, t.name, t.compliance_standard
ORDER BY completion_rate ASC, t.name;

-- ============================================================================
-- QUERY 5: Get all repeatable labels for a template
-- Use Case: Populate dropdown for repeatable field
-- Expected: Ordered list of labels for fridge/extinguisher templates
-- ============================================================================
SELECT 
  rl.label,
  rl.label_value,
  rl.is_default,
  rl.display_order
FROM template_repeatable_labels rl
JOIN task_templates t ON t.id = rl.template_id
WHERE t.slug = 'fridge_temps_cold_hold'
ORDER BY rl.display_order;

-- ============================================================================
-- QUERY 6: Get task instance with completion record
-- Use Case: View completed task details
-- Expected: Task instance with all completion data
-- ============================================================================
SELECT 
  ct.*,
  t.name as template_name,
  t.category,
  t.audit_category,
  json_build_object(
    'completed_at', tcr.completed_at,
    'completed_by', p.name,
    'completion_data', tcr.completion_data,
    'evidence_attachments', tcr.evidence_attachments,
    'duration_seconds', tcr.duration_seconds,
    'sop_acknowledged', tcr.sop_acknowledged,
    'risk_acknowledged', tcr.risk_acknowledged
  ) as completion_data
FROM checklist_tasks ct
JOIN task_templates t ON t.id = ct.template_id
LEFT JOIN task_completion_records tcr ON tcr.task_id = ct.id
LEFT JOIN profiles p ON p.id = tcr.completed_by
WHERE ct.status = 'completed'
ORDER BY tcr.completed_at DESC
LIMIT 10;

-- ============================================================================
-- QUERY 7: List pending tasks for a user
-- Use Case: My Tasks dashboard
-- Expected: All pending/in_progress tasks assigned to current user
-- ============================================================================
SELECT 
  ct.id,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  t.name as task_name,
  t.category,
  t.frequency,
  ct.status,
  ct.priority,
  s.name as site_name
FROM checklist_tasks ct
JOIN task_templates t ON t.id = ct.template_id
LEFT JOIN sites s ON s.id = ct.site_id
WHERE ct.assigned_to_user_id = 'USER_ID_HERE' -- Replace with actual user ID
  AND ct.status IN ('pending', 'in_progress', 'overdue')
ORDER BY ct.due_date ASC, ct.due_time ASC NULLS LAST;

-- ============================================================================
-- QUERY 8: Get overdue tasks across company
-- Use Case: Manager dashboard showing overdue compliance tasks
-- Expected: List of overdue tasks with assignment details
-- ============================================================================
SELECT 
  ct.id,
  ct.due_date,
  ct.due_time,
  t.name as task_name,
  t.is_critical,
  t.category,
  p.name as assigned_to,
  s.name as site_name,
  ct.status,
  ct.priority,
  NOW() - (ct.due_date + COALESCE(ct.due_time, '00:00'::time)) as overdue_duration
FROM checklist_tasks ct
JOIN task_templates t ON t.id = ct.template_id
LEFT JOIN profiles p ON p.id = ct.assigned_to_user_id
LEFT JOIN sites s ON s.id = ct.site_id
WHERE ct.status IN ('pending', 'in_progress')
  AND ct.due_date < CURRENT_DATE
ORDER BY t.is_critical DESC, ct.due_date ASC;

-- ============================================================================
-- QUERY 9: Get failure analysis report
-- Use Case: Identify problem areas in compliance
-- Expected: Templates with highest failure rates
-- ============================================================================
SELECT 
  t.name,
  t.category,
  t.compliance_standard,
  COUNT(tcr.id) as total_completions,
  COUNT(CASE WHEN tcr.completion_data->>'failed' = 'true' THEN 1 END) as failures,
  ROUND(100.0 * COUNT(CASE WHEN tcr.completion_data->>'failed' = 'true' THEN 1 END) / NULLIF(COUNT(tcr.id), 0), 1) as failure_rate
FROM task_templates t
JOIN checklist_tasks ct ON t.id = ct.template_id
JOIN task_completion_records tcr ON tcr.task_id = ct.id
WHERE tcr.completed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.id, t.name, t.category, t.compliance_standard
HAVING COUNT(tcr.id) >= 5  -- Minimum sample size
ORDER BY failure_rate DESC
LIMIT 10;

-- ============================================================================
-- QUERY 10: Get task statistics summary
-- Use Case: Executive dashboard showing compliance overview
-- Expected: Overall statistics across all templates
-- ============================================================================
SELECT 
  COUNT(DISTINCT t.id) as total_templates,
  COUNT(DISTINCT ct.id) as total_task_instances,
  COUNT(DISTINCT CASE WHEN ct.status = 'completed' THEN ct.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN ct.status = 'overdue' THEN ct.id END) as overdue_tasks,
  COUNT(DISTINCT CASE WHEN ct.status = 'failed' THEN ct.id END) as failed_tasks,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ct.status = 'completed' THEN ct.id END) / 
    NULLIF(COUNT(DISTINCT ct.id), 0), 1) as overall_completion_rate
FROM task_templates t
LEFT JOIN checklist_tasks ct ON t.id = ct.template_id
WHERE t.is_template_library = true;

-- ============================================================================
-- QUERY 11: Get contractor callouts
-- Use Case: Show contractor requests triggered by failed tasks
-- Expected: List of contractor callouts with status
-- ============================================================================
SELECT 
  cc.id,
  cc.requested_date,
  cc.scheduled_date,
  cc.status,
  cc.priority,
  cc.contractor_type,
  c.name as contractor_name,
  t.name as triggered_by_template,
  ct.due_date as task_due_date,
  cc.issue_description
FROM contractor_callouts cc
JOIN task_templates t ON t.id = cc.triggered_by_template_id
LEFT JOIN checklist_tasks ct ON ct.id = cc.triggered_by_task_id
LEFT JOIN contractors c ON c.id = cc.contractor_id
WHERE cc.company_id = 'COMPANY_ID_HERE' -- Replace with actual company ID
ORDER BY cc.requested_date DESC, cc.priority DESC;

-- ============================================================================
-- QUERY 12: Get critical tasks overview
-- Use Case: Priority dashboard showing critical compliance items
-- Expected: Critical templates with completion status
-- ============================================================================
SELECT 
  t.name,
  t.category,
  t.compliance_standard,
  COUNT(CASE WHEN ct.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN ct.status IN ('pending', 'in_progress') THEN 1 END) as pending,
  COUNT(CASE WHEN ct.status = 'overdue' THEN 1 END) as overdue,
  COUNT(CASE WHEN ct.status = 'failed' THEN 1 END) as failed
FROM task_templates t
LEFT JOIN checklist_tasks ct ON t.id = ct.template_id
WHERE t.is_critical = true
  AND ct.due_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY t.id, t.name, t.category, t.compliance_standard
ORDER BY overdue DESC, t.name;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after applying migrations to verify data integrity
-- ============================================================================

-- Count templates by category
SELECT category, COUNT(*) as count 
FROM task_templates 
WHERE is_template_library = true 
GROUP BY category 
ORDER BY category;

-- Verify no orphaned fields
SELECT COUNT(*) as orphaned_fields
FROM template_fields tf
LEFT JOIN task_templates tt ON tf.template_id = tt.id
WHERE tt.id IS NULL;

-- Verify no orphaned labels
SELECT COUNT(*) as orphaned_labels
FROM template_repeatable_labels rl
LEFT JOIN task_templates tt ON rl.template_id = tt.id
WHERE tt.id IS NULL;

-- Show templates with field counts
SELECT 
  tt.name,
  tt.category,
  tt.frequency,
  COUNT(tf.id) as field_count,
  COUNT(trl.id) as repeatable_label_count
FROM task_templates tt
LEFT JOIN template_fields tf ON tf.template_id = tt.id
LEFT JOIN template_repeatable_labels trl ON trl.template_id = tt.id
WHERE tt.is_template_library = true
GROUP BY tt.id, tt.name, tt.category, tt.frequency
ORDER BY tt.category, tt.name;

-- Verify all 18 templates are seeded
SELECT COUNT(*) as template_count 
FROM task_templates 
WHERE is_template_library = true;
-- Expected: 18
