-- Add INSERT policy for leave_balances
-- This allows managers/admins to create leave balances

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "admins_manage_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_insert_balances" ON leave_balances;

-- Policy: Managers/Admins/Owners can insert balances for their company
CREATE POLICY "managers_insert_balances"
ON leave_balances FOR INSERT
WITH CHECK (
  -- User must be manager/admin/owner in the same company
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

-- Also allow admins/owners to update/delete (for management)
CREATE POLICY "admins_manage_balances"
ON leave_balances FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner')
  )
);

