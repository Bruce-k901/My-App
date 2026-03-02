-- ============================================================================
-- SIMPLE FIX: Disable/Drop problematic triggers on messaging_messages
-- Run this to stop triggers from causing the user_id error
-- ============================================================================

-- Step 1: List all triggers on messaging_messages
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'messaging_messages'::regclass
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- Step 2: Temporarily disable all triggers to test if RLS policies are the issue
-- Uncomment the line below to disable triggers:
-- ALTER TABLE messaging_messages DISABLE TRIGGER ALL;

-- Step 3: Drop the notify_message_recipients trigger if it exists (it references user_id)
DROP TRIGGER IF EXISTS trg_notify_message_recipients ON public.messaging_messages;
DROP TRIGGER IF EXISTS trg_notify_message_recipients ON public.messages;

-- Step 4: Fix the notify_message_recipients function to handle both messaging_messages and messages
-- But make it safe - if columns don't exist, just return
CREATE OR REPLACE FUNCTION public.notify_message_recipients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- For now, just return NEW without doing anything
  -- We can re-enable notifications later after fixing the schema
  RETURN NEW;
END;
$function$;

-- Step 5: Check if update_channel_last_message function exists and is safe
-- This one should be fine since it only uses channel_id and created_at
SELECT 
  proname,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'update_channel_last_message'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Verify triggers are dropped/disabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'messaging_messages'::regclass
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;
