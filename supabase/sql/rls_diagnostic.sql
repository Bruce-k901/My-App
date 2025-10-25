-- RLS Diagnostic and Fix Script
-- This script checks and fixes common RLS issues that cause timeouts

-- 1. Check if RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'companies', 'sites', 'assets', 'contractors', 'tasks', 'incidents', 'temperature_logs')
ORDER BY tablename;

-- 2. Check existing policies
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
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'companies', 'sites', 'assets', 'contractors', 'tasks', 'incidents', 'temperature_logs')
ORDER BY tablename, policyname;

-- 3. Check if auth.uid() is working
SELECT auth.uid() as current_user_id;

-- 4. Check if user has a profile
SELECT 
    id,
    email,
    company_id,
    app_role,
    site_id
FROM public.profiles 
WHERE id = auth.uid();
