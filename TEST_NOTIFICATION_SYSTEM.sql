-- ============================================================================
-- TEST NOTIFICATION SYSTEM
-- Run these queries one at a time to test the notification system
-- ============================================================================

-- ============================================================================
-- STEP 1: Find Valid IDs to Use for Testing
-- ============================================================================

-- Get a real task ID with due_time set for today
SELECT 
  checklist_tasks.id as task_id,
  checklist_tasks.company_id,
  checklist_tasks.site_id,
  checklist_tasks.assigned_to_user_id,
  checklist_tasks.due_time,
  task_templates.name as task_name
FROM checklist_tasks
JOIN task_templates ON task_templates.id = checklist_tasks.template_id
WHERE checklist_tasks.due_date = CURRENT_DATE
  AND checklist_tasks.due_time IS NOT NULL
  AND checklist_tasks.status IN ('pending', 'in_progress')
LIMIT 1;

-- Get a real user ID (staff member)
SELECT 
  id as user_id,
  full_name,
  email,
  company_id,
  app_role
FROM profiles
WHERE app_role IN ('Staff', 'Manager')
LIMIT 1;

-- Get a real company ID
SELECT id as company_id, name FROM companies LIMIT 1;

-- Get a real site ID
SELECT id as site_id, name, company_id FROM sites LIMIT 1;

-- ============================================================================
-- STEP 2: Test Clock-In System
-- ============================================================================

-- Clock in a user (replace with actual IDs from Step 1)
-- INSERT INTO attendance_logs (user_id, company_id, site_id)
-- VALUES (
--   'PASTE_USER_ID_HERE'::uuid,
--   'PASTE_COMPANY_ID_HERE'::uuid,
--   'PASTE_SITE_ID_HERE'::uuid
-- );

-- Check if user is clocked in
-- SELECT is_user_clocked_in('PASTE_USER_ID_HERE'::uuid, 'PASTE_SITE_ID_HERE'::uuid);

-- Get active staff on site
-- SELECT * FROM get_active_staff_on_site('PASTE_SITE_ID_HERE'::uuid);

-- Get managers on shift
-- SELECT * FROM get_managers_on_shift('PASTE_SITE_ID_HERE'::uuid, 'PASTE_COMPANY_ID_HERE'::uuid);

-- ============================================================================
-- STEP 3: Test Task Ready Notification Function
-- ============================================================================

-- First, make sure the user is clocked in (run Step 2 first)
-- Then test creating a ready notification:
-- SELECT create_task_ready_notification(
--   'PASTE_TASK_ID_HERE'::uuid,      -- From Step 1
--   'PASTE_COMPANY_ID_HERE'::uuid,    -- From Step 1
--   'PASTE_SITE_ID_HERE'::uuid,       -- From Step 1
--   'PASTE_USER_ID_HERE'::uuid,       -- From Step 1 (must be clocked in)
--   'Test Task Name',                  -- Task name
--   '14:00'                            -- Due time
-- );

-- Check if notification was created
-- SELECT * FROM notifications 
-- WHERE type = 'task_ready' 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- ============================================================================
-- STEP 4: Test Late Task Notification Function
-- ============================================================================

-- Make sure at least one manager is clocked in first
-- Then test creating a late notification:
-- SELECT create_late_task_notification(
--   'PASTE_TASK_ID_HERE'::uuid,      -- From Step 1
--   'PASTE_COMPANY_ID_HERE'::uuid,    -- From Step 1
--   'PASTE_SITE_ID_HERE'::uuid,       -- From Step 1
--   'Test Task Name',                  -- Task name
--   '10:00',                           -- Due time (should be in the past)
--   'PASTE_USER_ID_HERE'::uuid        -- Assigned user ID
-- );

-- Check if notifications were created for managers
-- SELECT * FROM notifications 
-- WHERE type = 'task_late' 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- ============================================================================
-- STEP 5: Test Message Notification Trigger
-- ============================================================================

-- Get a real conversation ID
-- SELECT id as conversation_id, company_id FROM conversations LIMIT 1;

-- Get conversation participants
-- SELECT 
--   cp.user_id,
--   p.full_name,
--   p.email
-- FROM conversation_participants cp
-- JOIN profiles p ON p.id = cp.user_id
-- WHERE cp.conversation_id = 'PASTE_CONVERSATION_ID_HERE'::uuid
--   AND cp.left_at IS NULL;

-- Send a test message (this will trigger the notification automatically)
-- INSERT INTO messages (
--   conversation_id,
--   sender_id,
--   content,
--   message_type
-- ) VALUES (
--   'PASTE_CONVERSATION_ID_HERE'::uuid,
--   'PASTE_SENDER_ID_HERE'::uuid,
--   'Test message for notifications',
--   'text'
-- );

-- Check if message notification was created
-- SELECT * FROM notifications 
-- WHERE type = 'message' 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- ============================================================================
-- STEP 6: Test Edge Function Manually
-- ============================================================================

-- You can test the edge function via curl or Postman:
-- 
-- POST https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications
-- Headers:
--   Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--   Content-Type: application/json
--
-- This will check all tasks and create notifications automatically

-- ============================================================================
-- STEP 7: Clean Up Test Data (Optional)
-- ============================================================================

-- Delete test notifications
-- DELETE FROM notifications 
-- WHERE created_at > NOW() - INTERVAL '1 hour'
--   AND (title LIKE '%Test%' OR message LIKE '%Test%');

-- Clock out test user
-- UPDATE attendance_logs 
-- SET clock_out_at = NOW()
-- WHERE user_id = 'PASTE_USER_ID_HERE'::uuid
--   AND clock_out_at IS NULL;

-- ============================================================================
-- QUICK TEST: Get IDs for Testing
-- ============================================================================

-- Run these queries separately to get IDs:

-- 1. Get a Task ID with all related IDs:
SELECT 
  ct.id::text as task_id,
  ct.company_id::text as company_id,
  ct.site_id::text as site_id,
  ct.assigned_to_user_id::text as user_id,
  tt.name as task_name,
  ct.due_time::text as due_time
FROM checklist_tasks ct
JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.due_time IS NOT NULL
  AND ct.status IN ('pending', 'in_progress')
LIMIT 1;

-- 2. Get a User ID (Staff or Manager):
SELECT 
  p.id::text as user_id,
  p.full_name,
  p.email,
  p.company_id::text as company_id,
  p.app_role
FROM profiles p
WHERE p.app_role IN ('Staff', 'Manager')
LIMIT 1;

-- 3. Get a Company ID:
SELECT 
  c.id::text as company_id,
  c.name as company_name
FROM companies c
LIMIT 1;

-- 4. Get a Site ID:
SELECT 
  s.id::text as site_id,
  s.name as site_name,
  s.company_id::text as company_id
FROM sites s
LIMIT 1;

