-- ============================================================================
-- Check what functions these triggers are calling and if they reference user_id
-- ============================================================================

-- Get the full trigger definitions to see which functions they call
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as full_trigger_definition
FROM pg_trigger
WHERE tgrelid = 'messaging_messages'::regclass
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- Check the function definitions for functions that might be called by these triggers
-- These are likely suspects:
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND (
    proname LIKE '%update_channel%'
    OR proname LIKE '%thread_count%'
    OR proname LIKE '%unread%'
    OR proname LIKE '%message%'
  )
ORDER BY proname;
