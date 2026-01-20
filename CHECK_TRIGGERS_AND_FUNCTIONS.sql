-- ============================================================================
-- DIAGNOSTIC: Check all triggers and functions that might reference user_id
-- Run this to find what's causing the error
-- ============================================================================

-- 1. Check all triggers on messaging_messages
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  tgtype,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'messaging_messages'::regclass
  AND tgname NOT LIKE 'RI_%' -- Exclude foreign key triggers
ORDER BY tgname;

-- 2. Check all functions that reference user_id in messaging context
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND (
    proname LIKE '%message%' 
    OR proname LIKE '%notification%'
    OR proname LIKE '%conversation%'
  )
ORDER BY proname;

-- 3. Check if there's a trigger that automatically creates message_deliveries
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE pg_get_triggerdef(oid) LIKE '%message_deliveries%'
  OR pg_get_triggerdef(oid) LIKE '%message_reads%'
ORDER BY tgname;

-- 4. Check the actual table structure to see what columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messaging_messages'
ORDER BY ordinal_position;

-- 5. Check messaging_channel_members structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messaging_channel_members'
ORDER BY ordinal_position;
