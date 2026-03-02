-- Test script to verify direct updates work
-- This will help us see if the issue is with the RPC function or something else

-- Test 1: Try a direct UPDATE to see if it works
-- Replace with actual contractor ID and company_id
/*
UPDATE public.contractors
SET 
  contact_name = 'Test Contact Direct',
  address = 'Test Address Direct',
  category = 'test_category',
  website = 'https://test.com',
  site_id = NULL,
  type = 'reactive',
  contract_start = '2024-01-01',
  contract_expiry = '2025-01-01'
WHERE id = 'YOUR_CONTRACTOR_ID'::uuid
  AND company_id = 'YOUR_COMPANY_ID'::uuid
RETURNING id, name, contact_name, address, category, website, site_id, type, contract_start, contract_expiry;
*/

-- Test 2: Check if there are any triggers that might be interfering
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'contractors'
  AND event_object_schema = 'public';

-- Test 3: Check for constraints that might prevent updates
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.contractors'::regclass;

-- Test 4: Check current RLS policies
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

-- Test 5: Try calling the RPC function directly with test data
-- Replace with actual values
/*
SELECT * FROM public.insert_contractor_simple(
  'YOUR_COMPANY_ID'::uuid,
  'Test Contractor RPC',
  'test_category',
  'Test Contact',
  'test@example.com',
  '1234567890',
  NULL,
  'Test Address',
  'SW1A 1AA',
  'London',
  'https://test.com',
  NULL,
  NULL,
  'Test notes',
  NULL,
  'reactive',
  'active',
  true,
  '2024-01-01'::date,
  '2025-01-01'::date,
  NULL
);
*/

