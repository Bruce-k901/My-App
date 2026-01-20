-- ============================================================================
-- Migration: 20250207000003_create_training_bookings.sql
-- Description: Table + RLS policies for training session bookings
-- Note: This migration will be skipped if companies table doesn't exist yet
-- ============================================================================

-- Keep updated_at fresh (function can be created independently, outside DO block)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create training_bookings table (only if companies table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    CREATE TABLE IF NOT EXISTS public.training_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      user_id UUID NOT NULL,
      site_id UUID,
      course TEXT NOT NULL,
      level TEXT,
      provider TEXT,
      scheduled_date DATE,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'booked',
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Add foreign keys conditionally
    ALTER TABLE public.training_bookings 
    ADD CONSTRAINT training_bookings_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      ALTER TABLE public.training_bookings 
      ADD CONSTRAINT training_bookings_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      ALTER TABLE public.training_bookings 
      ADD CONSTRAINT training_bookings_site_id_fkey 
      FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_training_bookings_company ON public.training_bookings(company_id);
    CREATE INDEX IF NOT EXISTS idx_training_bookings_user ON public.training_bookings(user_id);

    -- Create trigger (only if table exists and function exists)
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'set_updated_at') THEN
      DROP TRIGGER IF EXISTS trg_training_bookings_updated_at ON public.training_bookings;
      CREATE TRIGGER trg_training_bookings_updated_at
        BEFORE UPDATE ON public.training_bookings
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;

    -- Enable RLS
    ALTER TABLE public.training_bookings ENABLE ROW LEVEL SECURITY;

    -- Policies: users can access bookings for members of their own company
    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      DROP POLICY IF EXISTS training_bookings_select ON public.training_bookings;
      DROP POLICY IF EXISTS training_bookings_insert ON public.training_bookings;
      DROP POLICY IF EXISTS training_bookings_update ON public.training_bookings;
      DROP POLICY IF EXISTS training_bookings_delete ON public.training_bookings;

      CREATE POLICY training_bookings_select
        ON public.training_bookings
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_bookings.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = training_bookings.company_id
              AND target.company_id = training_bookings.company_id
          )
        );

      CREATE POLICY training_bookings_insert
        ON public.training_bookings
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_bookings.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = training_bookings.company_id
              AND target.company_id = training_bookings.company_id
          )
        );

      CREATE POLICY training_bookings_update
        ON public.training_bookings
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_bookings.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = training_bookings.company_id
              AND target.company_id = training_bookings.company_id
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_bookings.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = training_bookings.company_id
              AND target.company_id = training_bookings.company_id
          )
        );

      CREATE POLICY training_bookings_delete
        ON public.training_bookings
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_bookings.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = training_bookings.company_id
              AND target.company_id = training_bookings.company_id
          )
        );
    ELSE
      RAISE NOTICE '⚠️ profiles table does not exist yet - skipping RLS policy creation';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping training_bookings table creation';
  END IF;
END $$;









