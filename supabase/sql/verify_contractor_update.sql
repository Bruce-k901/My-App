-- Verification script to check if contractor updates are working
-- Run this after updating a contractor to see what's actually in the database

-- Replace these with actual values from your test
/*
SELECT 
  id,
  name,
  contact_name,
  address,
  category,
  website,
  site_id,
  type,
  contract_start,
  contract_expiry,
  updated_at
FROM public.contractors
WHERE id = 'YOUR_CONTRACTOR_ID_HERE'::uuid;
*/

-- Or check all contractors for a company
/*
SELECT 
  id,
  name,
  contact_name,
  address,
  category,
  website,
  site_id,
  type,
  contract_start,
  contract_expiry,
  updated_at
FROM public.contractors
WHERE company_id = 'YOUR_COMPANY_ID_HERE'::uuid
ORDER BY updated_at DESC
LIMIT 10;
*/

-- Check if there are any constraints that might prevent updates
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.contractors'::regclass
  AND contype IN ('c', 'f', 'u', 'p'); -- Check, Foreign Key, Unique, Primary Key

