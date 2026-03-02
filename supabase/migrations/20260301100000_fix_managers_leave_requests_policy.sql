-- Fix the managers_create_leave_requests policy to handle role format variants
-- Roles may be stored as "General Manager" or "general_manager" etc.
DROP POLICY IF EXISTS "managers_create_leave_requests" ON leave_requests;

CREATE POLICY "managers_create_leave_requests"
ON leave_requests FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles
    WHERE (id = auth.uid() OR auth_user_id = auth.uid())
    AND LOWER(REPLACE(app_role::text, ' ', '_')) IN (
      'admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager'
    )
  )
);
