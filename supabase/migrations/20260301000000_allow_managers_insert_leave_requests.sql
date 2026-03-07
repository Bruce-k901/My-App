-- Allow managers/admins to insert leave_requests on behalf of staff
-- (e.g. recording absence from the rota page)
-- The existing policy only allows profile_id = auth.uid() (self-inserts).
CREATE POLICY "managers_create_leave_requests"
ON leave_requests FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles
    WHERE id = auth.uid()
    AND LOWER(app_role::text) IN ('admin', 'owner', 'manager', 'general manager', 'area manager', 'ops manager')
  )
);
