-- Diagnostic queries to check approval hierarchy setup
-- Run these in Supabase SQL Editor to see what's wrong

-- 1. Check if tables exist
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename IN ('regions', 'areas', 'approval_workflows', 'approval_steps')
ORDER BY tablename;

-- 2. Check if regions table has the right columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'regions'
ORDER BY ordinal_position;

-- 3. Check if areas table has the right columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'areas'
ORDER BY ordinal_position;

-- 4. Check RLS policies on regions
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
WHERE tablename = 'regions';

-- 5. Try to select from regions (will show RLS or permission issues)
SELECT COUNT(*) as region_count FROM regions;

-- 6. Check if sites table has area_id column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sites' AND column_name = 'area_id';

