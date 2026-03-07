-- Fix time_entries RLS policies to handle both identity patterns.
-- The original policies only check auth_user_id = auth.uid(), which fails
-- for profiles where id = auth.uid() but auth_user_id is NULL.
-- This aligns time_entries with staff_attendance which uses user_company_id().

-- Drop the old narrow policies
DROP POLICY IF EXISTS "view_own_entries" ON time_entries;
DROP POLICY IF EXISTS "employees_clock_in" ON time_entries;
DROP POLICY IF EXISTS "employees_clock_out" ON time_entries;

-- Recreate with identity-aware checks (id OR auth_user_id)
CREATE POLICY "view_own_entries"
ON time_entries FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
  )
);

CREATE POLICY "employees_clock_in"
ON time_entries FOR INSERT
WITH CHECK (
  profile_id IN (
    SELECT id FROM profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
  )
);

CREATE POLICY "employees_clock_out"
ON time_entries FOR UPDATE
USING (
  profile_id IN (
    SELECT id FROM profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
  )
  AND status = 'active'
);
