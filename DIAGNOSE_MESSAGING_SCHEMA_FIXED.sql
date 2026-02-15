-- ============================================================================
-- DIAGNOSTIC SCRIPT: Check Current Messaging Schema Structure
-- Run this FIRST to see what your actual table structure is
-- ============================================================================

-- ============================================================================
-- 1. Check messaging_messages table structure
-- ============================================================================
SELECT 
  'messaging_messages columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messaging_messages'
ORDER BY ordinal_position;

-- Check for sender column specifically
SELECT 
  'messaging_messages sender column' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_messages' 
      AND column_name = 'sender_profile_id'
    ) THEN 'sender_profile_id (correct)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_messages' 
      AND column_name = 'sender_id'
    ) THEN 'sender_id (needs update)'
    ELSE 'NO SENDER COLUMN FOUND'
  END as sender_column_status;

-- ============================================================================
-- 2. Check typing_indicators table structure
-- ============================================================================
SELECT 
  'typing_indicators columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'typing_indicators'
ORDER BY ordinal_position;

-- Check for channel/conversation column
SELECT 
  'typing_indicators channel column' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'typing_indicators' 
      AND column_name = 'channel_id'
    ) THEN 'channel_id (new structure)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'typing_indicators' 
      AND column_name = 'conversation_id'
    ) THEN 'conversation_id (old structure)'
    ELSE 'NO CHANNEL/CONVERSATION COLUMN FOUND'
  END as channel_column_status;

-- Check user_id vs profile_id
SELECT 
  'typing_indicators user column' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'typing_indicators' 
      AND column_name = 'profile_id'
    ) THEN 'profile_id (correct)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'typing_indicators' 
      AND column_name = 'user_id'
    ) THEN 'user_id (needs update)'
    ELSE 'NO USER COLUMN FOUND'
  END as user_column_status;

-- ============================================================================
-- 3. Check typing_indicators constraints
-- ============================================================================
SELECT 
  'typing_indicators constraints' as check_type,
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'typing_indicators'
AND table_schema = 'public';

-- Check primary key columns
SELECT 
  'typing_indicators primary key columns' as check_type,
  kcu.column_name,
  kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'typing_indicators'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY kcu.ordinal_position;

-- ============================================================================
-- 4. Check messaging_channel_members structure
-- ============================================================================
SELECT 
  'messaging_channel_members columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messaging_channel_members'
ORDER BY ordinal_position;

-- Check for profile_id vs user_id
SELECT 
  'messaging_channel_members user column' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_channel_members' 
      AND column_name = 'profile_id'
    ) THEN 'profile_id (correct)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_channel_members' 
      AND column_name = 'user_id'
    ) THEN 'user_id (needs update)'
    ELSE 'NO USER COLUMN FOUND'
  END as user_column_status;

-- ============================================================================
-- 5. Check current RLS policies
-- ============================================================================
SELECT 
  'messaging_messages RLS policies' as check_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual, 1, 100) || '...'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN substring(with_check, 1, 100) || '...'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'messaging_messages'
AND schemaname = 'public';

SELECT 
  'typing_indicators RLS policies' as check_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual, 1, 100) || '...'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN substring(with_check, 1, 100) || '...'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'typing_indicators'
AND schemaname = 'public';

SELECT 
  'messaging_channel_members RLS policies' as check_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual, 1, 100) || '...'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN substring(with_check, 1, 100) || '...'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'messaging_channel_members'
AND schemaname = 'public';

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 
  '=== SUMMARY ===' as summary,
  'Run FIX_MESSAGING_RLS_FINAL.sql after reviewing the above results' as next_step;
