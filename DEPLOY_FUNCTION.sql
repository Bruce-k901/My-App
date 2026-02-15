-- =====================================================
-- DEPLOY: Create payroll_run from attendance signoff
-- =====================================================
-- Run this script in Supabase SQL Editor to deploy/update the function

-- First, drop any existing versions
DROP FUNCTION IF EXISTS create_payroll_run_from_signoff(UUID, UUID, DATE, DATE, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_payroll_run_from_signoff CASCADE;

-- Then run the full function definition from create_payroll_run_from_signoff_v2.sql
-- (Copy the entire CREATE OR REPLACE FUNCTION ... block from that file)

-- After deploying, verify with:
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_payroll_run_from_signoff'
  AND n.nspname = 'public';

