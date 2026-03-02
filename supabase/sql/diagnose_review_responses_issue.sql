-- Diagnostic script to find the source of the "column rr.respondent does not exist" error
-- Run this in Supabase SQL editor to see what's actually in your database

-- 1. Check what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'review_responses'
ORDER BY ordinal_position;

-- 2. Check all constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'review_responses'::regclass
ORDER BY contype, conname;

-- 3. Check all indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'review_responses'
ORDER BY indexname;

-- 4. Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'review_responses'
ORDER BY policyname;

-- 5. Check for triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'review_responses';

-- 6. Check for views that reference review_responses
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE view_definition LIKE '%review_responses%'
  AND (view_definition LIKE '%respondent%' 
       AND view_definition NOT LIKE '%respondent_type%'
       AND view_definition NOT LIKE '%respondent_id%');

-- 7. Check for functions that reference review_responses with wrong column
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition LIKE '%review_responses%'
  AND routine_definition LIKE '%respondent%'
  AND routine_definition NOT LIKE '%respondent_type%'
  AND routine_definition NOT LIKE '%respondent_id%';


