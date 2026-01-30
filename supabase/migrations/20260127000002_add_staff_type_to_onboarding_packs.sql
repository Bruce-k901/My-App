-- ============================================================================
-- Migration: 20260127000002_add_staff_type_to_onboarding_packs.sql
-- Description: Add staff_type column to company_onboarding_packs to support
--              Head Office vs Site Staff distinction
-- ============================================================================

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'company_onboarding_packs'
  ) THEN

    -- Add staff_type column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'company_onboarding_packs'
        AND column_name = 'staff_type'
    ) THEN
      ALTER TABLE public.company_onboarding_packs
        ADD COLUMN staff_type TEXT DEFAULT 'site_staff'
        CHECK (staff_type IN ('head_office', 'site_staff'));
      
      -- Set default for existing records
      UPDATE public.company_onboarding_packs
      SET staff_type = 'site_staff'
      WHERE staff_type IS NULL;
      
      -- Make it NOT NULL after setting defaults
      ALTER TABLE public.company_onboarding_packs
        ALTER COLUMN staff_type SET NOT NULL;
      
      RAISE NOTICE '✅ Added staff_type column to company_onboarding_packs';
    ELSE
      RAISE NOTICE '⚠️ staff_type column already exists';
    END IF;

    -- Update the index to include staff_type for better filtering
    DROP INDEX IF EXISTS idx_company_onboarding_packs_filters;
    CREATE INDEX IF NOT EXISTS idx_company_onboarding_packs_filters 
      ON public.company_onboarding_packs(company_id, staff_type, boh_foh, pay_type) 
      WHERE deleted_at IS NULL;

  ELSE
    RAISE NOTICE '⚠️ company_onboarding_packs table does not exist - skipping';
  END IF;
END
$do$;
