-- ============================================================================
-- Set Default Times for Triggered Tasks (Callout Follow-up, Document Review, PPM)
-- These tasks don't have due_time because they're event-driven, but we can
-- set a default time so they can receive notifications
-- ============================================================================

-- First, let's see what we're about to update
SELECT 
  id,
  custom_name,
  template_id,
  due_date,
  due_time,
  status,
  CASE 
    WHEN custom_name LIKE 'Follow up:%' THEN 'Callout Follow-up'
    WHEN custom_name LIKE 'Document Review Due:%' THEN 'Document Review'
    WHEN custom_name LIKE 'PPM Required:%' THEN 'PPM Overdue'
    ELSE 'Other'
  END as task_type
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND (due_time IS NULL OR due_time = '')
ORDER BY 
  CASE 
    WHEN custom_name LIKE 'Follow up:%' THEN 1
    WHEN custom_name LIKE 'Document Review Due:%' THEN 2
    WHEN custom_name LIKE 'PPM Required:%' THEN 3
    ELSE 4
  END;

-- ============================================================================
-- Option 1: Set default times based on task type
-- ============================================================================
-- Callout follow-ups: 09:00 (morning check)
-- Document reviews: 10:00 (business hours)
-- PPM overdue: 08:00 (early morning priority)

UPDATE checklist_tasks
SET due_time = CASE 
  WHEN custom_name LIKE 'Follow up:%' THEN '09:00'
  WHEN custom_name LIKE 'Document Review Due:%' THEN '10:00'
  WHEN custom_name LIKE 'PPM Required:%' THEN '08:00'
  ELSE '12:00' -- Default fallback
END
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND (due_time IS NULL OR due_time = '');

-- Verify the update
SELECT 
  id,
  custom_name,
  due_time,
  CASE 
    WHEN custom_name LIKE 'Follow up:%' THEN 'Callout Follow-up'
    WHEN custom_name LIKE 'Document Review Due:%' THEN 'Document Review'
    WHEN custom_name LIKE 'PPM Required:%' THEN 'PPM Overdue'
    ELSE 'Other'
  END as task_type
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND due_time IS NOT NULL
ORDER BY due_time;

-- Count how many tasks now have due_time
SELECT 
  COUNT(*) FILTER (WHERE due_time IS NOT NULL) as tasks_with_due_time,
  COUNT(*) FILTER (WHERE due_time IS NULL) as tasks_without_due_time,
  COUNT(*) as total_tasks_due_today
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress');





