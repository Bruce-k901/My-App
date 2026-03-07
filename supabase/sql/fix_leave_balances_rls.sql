-- Fix RLS policies for leave_balances table
-- Allow managers/admins to see all employees in their company

-- Drop existing policies
DROP POLICY IF EXISTS "view_own_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_view_balances" ON leave_balances;
DROP POLICY IF EXISTS "admins_manage_balances" ON leave_balances;

-- Policy: Employees can view their own balances
CREATE POLICY "view_own_balances"
ON leave_balances FOR SELECT
USING (
  profile_id = auth.uid()
);

-- Policy: Managers/Admins/Owners can view all balances in their company
CREATE POLICY "managers_view_company_balances"
ON leave_balances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

-- Policy: Admins/Owners can manage balances
CREATE POLICY "admins_manage_balances"
ON leave_balances FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner')
  )
);

