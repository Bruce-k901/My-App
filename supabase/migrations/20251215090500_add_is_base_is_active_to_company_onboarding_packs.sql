-- ============================================================================
-- Migration: 20251215090500_add_is_base_is_active_to_company_onboarding_packs.sql
-- Description:
-- Some environments may already have `company_onboarding_packs` created without
-- the `is_base` / `is_active` columns. This migration adds them safely.
-- ============================================================================

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'company_onboarding_packs'
  ) THEN

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'company_onboarding_packs'
        AND column_name = 'is_base'
    ) THEN
      ALTER TABLE public.company_onboarding_packs
        ADD COLUMN is_base BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'company_onboarding_packs'
        AND column_name = 'is_active'
    ) THEN
      ALTER TABLE public.company_onboarding_packs
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;

  END IF;
END
$do$;



