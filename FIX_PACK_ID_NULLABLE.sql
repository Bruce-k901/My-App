-- =====================================================
-- FIX: Make pack_id nullable in employee_onboarding_assignments
-- =====================================================
-- Not all onboarding assignments need a pack assigned

ALTER TABLE public.employee_onboarding_assignments
ALTER COLUMN pack_id DROP NOT NULL;

-- Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_onboarding_assignments'
  AND column_name = 'pack_id';
