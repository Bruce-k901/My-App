-- Fix all RLS policies that use LOWER(app_role) without casting
-- app_role is an enum, so it needs to be cast to TEXT first

-- Fix leave_balances policies
DROP POLICY IF EXISTS "managers_view_company_balances" ON leave_balances;

CREATE POLICY "managers_view_company_balances"
ON leave_balances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR (p.auth_user_id IS NOT NULL AND p.auth_user_id = auth.uid()))
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

-- Fix any other policies that might have this issue
-- Check what policies exist
SELECT 
  tablename,
  policyname,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%lower%app_role%' OR qual LIKE '%LOWER%app_role%')
  AND qual NOT LIKE '%::TEXT%';

