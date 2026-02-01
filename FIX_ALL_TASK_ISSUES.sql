-- ============================================================================
-- Fix All Task Issues
-- ============================================================================
-- 1. Tasks have no assigned users (assigned_to_user_id = null)
-- 2. Tasks have no names (custom_name = null)
-- 3. PPM tasks being created for archived assets
-- ============================================================================

BEGIN;

-- ============================================================================
-- Issue 1: Fix tasks with no assigned users
-- ============================================================================

-- Update tasks to assign to template's assigned user, or site GM, or company admin
UPDATE checklist_tasks ct
SET assigned_to_user_id = COALESCE(
  -- Try template's assigned user
  (SELECT assigned_to_user_id FROM task_templates tt WHERE tt.id = ct.template_id),
  -- Try site GM
  (SELECT gm_user_id FROM sites s WHERE s.id = ct.site_id),
  -- Try company admin/owner
  (SELECT p.id FROM profiles p 
   JOIN user_roles ur ON ur.user_id = p.id
   WHERE p.company_id = ct.company_id 
   AND ur.role IN ('admin', 'owner')
   LIMIT 1),
  -- Fallback: any manager in company
  (SELECT p.id FROM profiles p 
   JOIN user_roles ur ON ur.user_id = p.id
   WHERE p.company_id = ct.company_id 
   AND ur.role = 'manager'
   LIMIT 1)
)
WHERE assigned_to_user_id IS NULL
AND status IN ('pending', 'in_progress');

-- ============================================================================
-- Issue 2: Fix tasks with no names
-- ============================================================================

-- Update tasks to have names from template or generate default name
UPDATE checklist_tasks ct
SET custom_name = COALESCE(
  ct.custom_name, -- Keep if exists
  -- Try template name
  (SELECT name FROM task_templates tt WHERE tt.id = ct.template_id),
  -- Try from task_data
  ct.task_data->>'name',
  -- Generate default based on type
  CASE 
    WHEN ct.task_data->>'source_type' = 'ppm_service' THEN 
      'PPM Service: ' || COALESCE(
        (SELECT name FROM assets a WHERE a.id = (ct.task_data->>'asset_id')::uuid),
        'Asset'
      )
    WHEN ct.task_data->>'source_type' = 'callout_followup' THEN 
      'Follow up: Callout'
    WHEN ct.task_data->>'source_type' = 'general_task' THEN 
      'General Task'
    ELSE 
      'Task'
  END
)
WHERE (custom_name IS NULL OR custom_name = '')
AND status IN ('pending', 'in_progress');

-- ============================================================================
-- Issue 3: Delete PPM tasks for archived assets
-- ============================================================================

-- Delete PPM tasks for archived assets
DELETE FROM checklist_tasks ct
WHERE ct.task_data->>'source_type' = 'ppm_service'
AND EXISTS (
  SELECT 1 FROM assets a
  WHERE a.id = (ct.task_data->>'asset_id')::uuid
  AND a.archived = true
)
AND ct.status IN ('pending', 'in_progress');

-- Delete callout follow-up tasks for archived assets
DELETE FROM checklist_tasks ct
WHERE ct.task_data->>'source_type' = 'callout_followup'
AND EXISTS (
  SELECT 1 FROM callouts c
  JOIN assets a ON a.id = c.asset_id
  WHERE c.id = (ct.task_data->>'callout_id')::uuid
  AND a.archived = true
)
AND ct.status IN ('pending', 'in_progress');

-- ============================================================================
-- Issue 4: Update notification system to handle unassigned tasks
-- ============================================================================

-- Update create_task_ready_notification to send to managers if no assigned user
CREATE OR REPLACE FUNCTION public.create_task_ready_notification(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_user_id UUID DEFAULT NULL, -- Now optional
  p_task_name TEXT,
  p_due_time TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_clocked_in BOOLEAN;
  v_effective_due_time TEXT;
  v_manager RECORD;
  v_notification_count INTEGER := 0;
BEGIN
  -- If no user assigned, send to managers on shift
  IF p_user_id IS NULL THEN
    FOR v_manager IN 
      SELECT * FROM public.get_managers_on_shift(p_site_id, p_company_id)
    LOOP
      -- Check if notification already exists
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE task_id = p_task_id
          AND type = 'task_ready'
          AND user_id = v_manager.user_id
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (
          company_id,
          site_id,
          user_id,
          task_id,
          type,
          title,
          message,
          severity,
          priority,
          recipient_role
        ) VALUES (
          p_company_id,
          p_site_id,
          v_manager.user_id,
          p_task_id,
          'task_ready',
          'Task Ready: ' || COALESCE(p_task_name, 'Untitled Task'),
          'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is ready to complete.' ||
          CASE 
            WHEN p_due_time IS NOT NULL AND p_due_time != '' 
            THEN ' Due at ' || p_due_time || '.'
            ELSE ' Due today.'
          END,
          'info',
          'medium',
          'manager'
        );
        v_notification_count := v_notification_count + 1;
      END IF;
    END LOOP;
    
    -- Return first notification ID if any created
    IF v_notification_count > 0 THEN
      SELECT id INTO v_notification_id
      FROM public.notifications
      WHERE task_id = p_task_id
        AND type = 'task_ready'
        AND created_at::date = CURRENT_DATE
      LIMIT 1;
    END IF;
    
    RETURN v_notification_id;
  END IF;
  
  -- Original logic for assigned users
  SELECT public.is_user_clocked_in(p_user_id, p_site_id) INTO v_clocked_in;
  
  IF NOT v_clocked_in THEN
    RETURN NULL;
  END IF;
  
  -- Get effective due_time
  IF p_due_time IS NULL OR p_due_time = '' THEN
    SELECT COALESCE(
      NULLIF(ct.due_time, ''),
      ct.task_data->>'due_time',
      (SELECT value->>'due_time' 
       FROM jsonb_array_elements(ct.task_data->'daypart_times') 
       WHERE value->>'due_time' IS NOT NULL 
       LIMIT 1),
      '09:00'
    ) INTO v_effective_due_time
    FROM checklist_tasks ct
    WHERE ct.id = p_task_id;
  ELSE
    v_effective_due_time := p_due_time;
  END IF;
  
  -- Check if notification already exists
  SELECT id INTO v_notification_id
  FROM public.notifications
  WHERE task_id = p_task_id
    AND type = 'task_ready'
    AND created_at::date = CURRENT_DATE
    AND user_id = p_user_id;
  
  IF v_notification_id IS NULL THEN
    INSERT INTO public.notifications (
      company_id,
      site_id,
      user_id,
      task_id,
      type,
      title,
      message,
      severity,
      priority,
      recipient_role
    ) VALUES (
      p_company_id,
      p_site_id,
      p_user_id,
      p_task_id,
      'task_ready',
      'Task Ready: ' || COALESCE(p_task_name, 'Untitled Task'),
      'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is ready to complete.' ||
      CASE 
        WHEN v_effective_due_time IS NOT NULL AND v_effective_due_time != '' 
        THEN ' Due at ' || v_effective_due_time || '.'
        ELSE ' Due today.'
      END,
      'info',
      'medium',
      'staff'
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- Issue 5: Add constraint to prevent tasks without names
-- ============================================================================

-- Add check constraint to ensure tasks always have a name (but allow NULL for now to avoid breaking existing data)
-- We'll enforce this after fixing existing data

-- For existing null names, generate names from template or task_data
UPDATE checklist_tasks ct
SET custom_name = COALESCE(
  -- Try template name
  (SELECT name FROM task_templates tt WHERE tt.id = ct.template_id),
  -- Try from task_data
  ct.task_data->>'name',
  -- Generate based on source type
  CASE 
    WHEN ct.task_data->>'source_type' = 'ppm_service' THEN 
      'PPM Required: ' || COALESCE(
        (SELECT name FROM assets a WHERE a.id = (ct.task_data->>'asset_id')::uuid),
        'Asset'
      )
    WHEN ct.task_data->>'source_type' = 'callout_followup' THEN 
      'Follow up: ' || COALESCE(
        (SELECT a.name FROM callouts c JOIN assets a ON a.id = c.asset_id WHERE c.id = (ct.task_data->>'callout_id')::uuid),
        'Callout'
      )
    WHEN ct.task_data->>'source_type' = 'general_task' THEN 
      'General Task'
    WHEN ct.task_data->>'source_type' = 'sop_review' THEN 
      'SOP Review Required'
    WHEN ct.task_data->>'source_type' = 'ra_review' THEN 
      'Risk Assessment Review Required'
    ELSE 
      'Task'
  END
)
WHERE (custom_name IS NULL OR custom_name = '')
AND status IN ('pending', 'in_progress');

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check how many tasks were fixed
SELECT 
  'Tasks with assigned users:' AS check_type,
  COUNT(*) AS count
FROM checklist_tasks
WHERE assigned_to_user_id IS NOT NULL
AND status IN ('pending', 'in_progress')
AND due_date = CURRENT_DATE;

SELECT 
  'Tasks with names:' AS check_type,
  COUNT(*) AS count
FROM checklist_tasks
WHERE custom_name IS NOT NULL AND custom_name != ''
AND status IN ('pending', 'in_progress')
AND due_date = CURRENT_DATE;

SELECT 
  'PPM tasks for archived assets (should be 0):' AS check_type,
  COUNT(*) AS count
FROM checklist_tasks ct
WHERE ct.task_data->>'source_type' = 'ppm_service'
AND EXISTS (
  SELECT 1 FROM assets a
  WHERE a.id = (ct.task_data->>'asset_id')::uuid
  AND a.archived = true
)
AND ct.status IN ('pending', 'in_progress');

