-- ============================================
-- IDENTITY COLUMN AUDIT
-- Purpose: Find all user reference columns across the database
-- Run this in Supabase SQL Editor to identify what needs fixing
-- ============================================

-- Find all columns that reference users
SELECT 
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  (
    SELECT STRING_AGG(
      ccu.table_schema || '.' || ccu.table_name || '.' || ccu.column_name, 
      ', '
    )
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema = c.table_schema
      AND kcu.table_name = c.table_name
      AND kcu.column_name = c.column_name
    LIMIT 1
  ) as foreign_key_to
FROM information_schema.columns c
WHERE c.column_name IN (
  'user_id', 'profile_id', 'created_by', 'updated_by', 
  'assigned_to', 'sender_id', 'receiver_id', 'approved_by',
  'reviewed_by', 'counted_by', 'uploaded_by', 'sender_profile_id',
  'receiver_profile_id', 'created_by_profile_id', 'updated_by_profile_id'
)
AND c.table_schema IN ('public', 'stockly')
ORDER BY 
  c.table_schema, 
  c.table_name, 
  CASE 
    WHEN c.column_name = 'user_id' THEN 1
    WHEN c.column_name = 'profile_id' THEN 2
    WHEN c.column_name LIKE '%_id' AND c.column_name NOT LIKE '%profile_id%' THEN 3
    ELSE 4
  END;

-- ============================================
-- RLS POLICIES AUDIT
-- Find all RLS policies that reference user identity
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public', 'stockly')
  AND (
    qual::text LIKE '%auth.uid()%' OR
    qual::text LIKE '%user_id%' OR
    qual::text LIKE '%profile_id%' OR
    with_check::text LIKE '%auth.uid()%' OR
    with_check::text LIKE '%user_id%' OR
    with_check::text LIKE '%profile_id%'
  )
ORDER BY schemaname, tablename, policyname;

-- ============================================
-- FOREIGN KEY AUDIT
-- Find all foreign keys pointing to auth.users vs profiles
-- ============================================

SELECT 
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('public', 'stockly')
  AND (
    ccu.table_name = 'users' OR
    ccu.table_name = 'profiles' OR
    kcu.column_name LIKE '%user_id%' OR
    kcu.column_name LIKE '%profile_id%'
  )
ORDER BY tc.table_schema, tc.table_name, kcu.column_name;

-- ============================================
-- SUMMARY QUERIES
-- ============================================

-- Count tables with user_id vs profile_id
SELECT 
  'TABLES WITH user_id' as category,
  COUNT(DISTINCT table_name) as count
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema IN ('public', 'stockly')
UNION ALL
SELECT 
  'TABLES WITH profile_id' as category,
  COUNT(DISTINCT table_name) as count
FROM information_schema.columns
WHERE column_name = 'profile_id'
  AND table_schema IN ('public', 'stockly');

-- Count foreign keys to auth.users vs profiles
SELECT 
  'FKs to auth.users' as category,
  COUNT(*) as count
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('public', 'stockly')
  AND ccu.table_schema = 'auth'
  AND ccu.table_name = 'users'
UNION ALL
SELECT 
  'FKs to profiles' as category,
  COUNT(*) as count
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('public', 'stockly')
  AND ccu.table_schema = 'public'
  AND ccu.table_name = 'profiles';

