-- Test script to verify RPC functions work correctly
-- Run this to test if the functions can actually save data

-- Test 1: Try inserting directly into contractors table (bypassing RPC)
-- Replace 'YOUR_COMPANY_ID' with an actual company_id from your database
/*
INSERT INTO public.contractors (
  company_id,
  name,
  contact_name,
  address,
  category,
  website,
  site_id,
  type,
  contract_start,
  contract_expiry
) VALUES (
  'YOUR_COMPANY_ID'::uuid,
  'Test Contractor Direct',
  'Test Contact',
  'Test Address',
  'Test Category',
  'https://test.com',
  NULL,
  'reactive',
  '2024-01-01',
  '2025-01-01'
) RETURNING id, name, contact_name, address, category, website, site_id, type, contract_start, contract_expiry;
*/

-- Test 2: Check if RPC function exists and what it returns
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.proowner::regrole as owner,
  p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('insert_contractor_simple', 'update_contractor_simple');

-- Test 3: Check RLS policies on contractors table
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
WHERE tablename = 'contractors';

-- Test 4: Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'contractors'
  AND grantee IN ('postgres', 'service_role', 'authenticated');

