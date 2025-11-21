-- ============================================================================
-- DIAGNOSTIC SCRIPT: Check Why user_id/company_id Keeps Getting Set to NULL
-- Run this in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- Step 1: Check if there are multiple profiles with same auth_user_id or id
SELECT 
  'PROFILES WITH DUPLICATE auth_user_id' as check_type,
  auth_user_id,
  COUNT(*) as count,
  array_agg(id) as profile_ids,
  array_agg(company_id) as company_ids
FROM public.profiles
WHERE auth_user_id IS NOT NULL
GROUP BY auth_user_id
HAVING COUNT(*) > 1;

-- Step 2: Check if there are profiles where id != auth_user_id
SELECT 
  'PROFILES WHERE id != auth_user_id' as check_type,
  id as profile_id,
  auth_user_id,
  email,
  company_id,
  CASE 
    WHEN id = auth_user_id THEN 'MATCH'
    WHEN id != auth_user_id THEN 'MISMATCH'
    ELSE 'NULL'
  END as id_match_status
FROM public.profiles
WHERE auth_user_id IS NOT NULL
ORDER BY email;

-- Step 3: Check for profiles with NULL company_id
SELECT 
  'PROFILES WITH NULL company_id' as check_type,
  id,
  auth_user_id,
  email,
  company_id,
  app_role,
  created_at,
  updated_at
FROM public.profiles
WHERE company_id IS NULL
ORDER BY updated_at DESC;

-- Step 4: Check for triggers on profiles table
SELECT 
  'TRIGGERS ON PROFILES TABLE' as check_type,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Step 5: Check for functions that might update profiles
SELECT 
  'FUNCTIONS THAT MIGHT UPDATE PROFILES' as check_type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%UPDATE profiles%'
    OR routine_definition ILIKE '%profiles%UPDATE%'
    OR routine_definition ILIKE '%company_id%'
  )
ORDER BY routine_name;

-- Step 6: Check recent profile updates (if you have audit logging)
-- This will show the last 20 profile updates
SELECT 
  'RECENT PROFILE UPDATES' as check_type,
  id,
  email,
  company_id,
  updated_at
FROM public.profiles
ORDER BY updated_at DESC
LIMIT 20;

-- Step 7: Check if handle_new_user trigger is active
SELECT 
  'AUTH TRIGGERS' as check_type,
  trigger_name,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

