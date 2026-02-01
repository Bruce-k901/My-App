-- ============================================================================
-- Migration: Create Company Modules Table
-- Description: Track which modules each company has enabled (checkly, stockly, peoply)
-- Note: This migration will be skipped if companies table doesn't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    -- Track which modules each company has enabled
    CREATE TABLE IF NOT EXISTS public.company_modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      module TEXT NOT NULL CHECK (module IN ('checkly', 'stockly', 'peoply')),
      is_enabled BOOLEAN DEFAULT TRUE,
      enabled_at TIMESTAMPTZ DEFAULT NOW(),
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id, module)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'company_modules_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'company_modules'
    ) THEN
      ALTER TABLE public.company_modules
      ADD CONSTRAINT company_modules_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_company_modules_company ON public.company_modules(company_id);

    -- Enable RLS
    ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

    -- RLS Policy (only if profiles table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY company_modules_access ON public.company_modules
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = company_modules.company_id
          )
        );
    END IF;

    -- Seed existing companies with Checkly module
    INSERT INTO public.company_modules (company_id, module, is_enabled)
    SELECT id, 'checkly', TRUE FROM public.companies
    ON CONFLICT (company_id, module) DO NOTHING;
  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping company_modules table creation';
  END IF;
END $$;

