-- ============================================================================
-- Migration: Fix waste_logs company_id column
-- Description: Ensure waste_logs table has company_id column (fix for migration issues)
-- Note: This migration will be skipped if waste_logs table doesn't exist yet
-- ============================================================================

-- Add company_id column if it doesn't exist
DO $$
BEGIN
  -- Only proceed if waste_logs, sites, and companies tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_logs')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN

    -- Check if column exists
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'waste_logs' 
      AND column_name = 'company_id'
    ) THEN
      -- Add column (nullable first)
      ALTER TABLE public.waste_logs 
      ADD COLUMN company_id UUID;
      
      -- Populate company_id from site_id
      UPDATE public.waste_logs wl
      SET company_id = s.company_id
      FROM public.sites s
      WHERE wl.site_id = s.id
      AND wl.company_id IS NULL;
      
      -- Make it NOT NULL
      ALTER TABLE public.waste_logs 
      ALTER COLUMN company_id SET NOT NULL;
      
      -- Add foreign key constraint only if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'waste_logs' 
        AND constraint_name = 'waste_logs_company_id_fkey'
      ) THEN
        ALTER TABLE public.waste_logs 
        ADD CONSTRAINT waste_logs_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id);
      END IF;
      
      -- Create index if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON public.waste_logs(company_id);
      
      RAISE NOTICE 'Added company_id column to waste_logs table';
    ELSE
      RAISE NOTICE 'company_id column already exists in waste_logs table';
      
      -- Ensure foreign key constraint exists
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'waste_logs' 
        AND constraint_name = 'waste_logs_company_id_fkey'
      ) THEN
        ALTER TABLE public.waste_logs 
        ADD CONSTRAINT waste_logs_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id);
      END IF;
      
      -- Ensure index exists
      CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON public.waste_logs(company_id);
    END IF;
  ELSE
    RAISE NOTICE '⚠️ waste_logs, sites, or companies tables do not exist yet - skipping waste_logs company_id fix';
  END IF;
END $$;

