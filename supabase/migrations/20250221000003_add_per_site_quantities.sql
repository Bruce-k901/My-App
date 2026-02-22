-- Add table to track per-site quantities for addons
-- This allows different sites to have different quantities of sensors/tags
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_addon_purchases')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    CREATE TABLE IF NOT EXISTS public.company_addon_site_quantities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_addon_purchase_id UUID NOT NULL,
      site_id UUID NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_addon_purchase_id, site_id)
    );

    -- Add foreign keys conditionally (only if they don't exist)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'company_addon_site_quantities_purchase_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'company_addon_site_quantities'
    ) THEN
      ALTER TABLE public.company_addon_site_quantities
      ADD CONSTRAINT company_addon_site_quantities_purchase_id_fkey
      FOREIGN KEY (company_addon_purchase_id) REFERENCES public.company_addon_purchases(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'company_addon_site_quantities_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'company_addon_site_quantities'
    ) THEN
      ALTER TABLE public.company_addon_site_quantities
      ADD CONSTRAINT company_addon_site_quantities_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
    END IF;

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_addon_site_quantities_purchase_id ON public.company_addon_site_quantities(company_addon_purchase_id);
    CREATE INDEX IF NOT EXISTS idx_addon_site_quantities_site_id ON public.company_addon_site_quantities(site_id);

    -- RLS Policies
    ALTER TABLE public.company_addon_site_quantities ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist (to allow recreation)
    DROP POLICY IF EXISTS addon_site_quantities_select_own_company ON public.company_addon_site_quantities;
    DROP POLICY IF EXISTS addon_site_quantities_insert_own_company ON public.company_addon_site_quantities;
    DROP POLICY IF EXISTS addon_site_quantities_update_own_company ON public.company_addon_site_quantities;

    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY addon_site_quantities_select_own_company
        ON public.company_addon_site_quantities
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.company_addon_purchases cap
            JOIN public.profiles p ON p.company_id = cap.company_id
            WHERE cap.id = company_addon_site_quantities.company_addon_purchase_id
              AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          )
        );

      CREATE POLICY addon_site_quantities_insert_own_company
        ON public.company_addon_site_quantities
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.company_addon_purchases cap
            JOIN public.profiles p ON p.company_id = cap.company_id
            WHERE cap.id = company_addon_site_quantities.company_addon_purchase_id
              AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          )
        );

      CREATE POLICY addon_site_quantities_update_own_company
        ON public.company_addon_site_quantities
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.company_addon_purchases cap
            JOIN public.profiles p ON p.company_id = cap.company_id
            WHERE cap.id = company_addon_site_quantities.company_addon_purchase_id
              AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.company_addon_purchases cap
            JOIN public.profiles p ON p.company_id = cap.company_id
            WHERE cap.id = company_addon_site_quantities.company_addon_purchase_id
              AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          )
        );
    END IF;

    -- Ensure columns exist in company_addon_purchases (idempotent)
    ALTER TABLE public.company_addon_purchases
    ADD COLUMN IF NOT EXISTS monthly_recurring_cost DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS hardware_cost_total DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS quantity_per_site INTEGER DEFAULT 1;

    COMMENT ON TABLE public.company_addon_site_quantities IS 'Tracks per-site quantities for addons (e.g., Site A: 3 sensors, Site B: 5 sensors)';
    COMMENT ON COLUMN public.company_addon_site_quantities.quantity IS 'Quantity of addon units (sensors/tags) for this specific site';

  ELSE
    RAISE NOTICE '⚠️ Required tables (company_addon_purchases, sites) do not exist yet - skipping company_addon_site_quantities table creation';
  END IF;
END $$;

