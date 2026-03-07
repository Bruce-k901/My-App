-- Clear Vicky Thomas assignments for retest after RLS fix
UPDATE public.course_assignments
SET status = 'expired', updated_at = NOW()
WHERE profile_id = 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62'
  AND status IN ('invited', 'confirmed', 'pending');
