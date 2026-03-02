-- ============================================================================
-- Migration: 20251215090000_add_base_pack_id_to_employee_onboarding_assignments.sql
-- Description:
-- Some environments may already have `employee_onboarding_assignments` created
-- without the `base_pack_id` column. This migration adds it safely.
-- ============================================================================

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'employee_onboarding_assignments'
  ) THEN

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'employee_onboarding_assignments'
        AND column_name = 'base_pack_id'
    ) THEN
      ALTER TABLE public.employee_onboarding_assignments
        ADD COLUMN base_pack_id UUID NULL;
    END IF;

    -- Add FK if the packs table exists (and if constraint isn't already present)
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'company_onboarding_packs'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'employee_onboarding_assignments_base_pack_id_fkey'
      ) THEN
        ALTER TABLE public.employee_onboarding_assignments
          ADD CONSTRAINT employee_onboarding_assignments_base_pack_id_fkey
          FOREIGN KEY (base_pack_id)
          REFERENCES public.company_onboarding_packs(id)
          ON DELETE RESTRICT;
      END IF;
    END IF;

  END IF;
END
$do$;
