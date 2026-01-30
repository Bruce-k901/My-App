-- ============================================================================
-- Migration: 20260127000001_create_site_equipment_positions.sql
-- Description: Creates site_equipment_positions table and adds position_id to temperature_logs
-- Purpose: Enable persistent, staff-friendly nicknames for temperature monitoring equipment
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN

    -- ============================================================================
    -- 1. CREATE site_equipment_positions TABLE
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.site_equipment_positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      position_type TEXT CHECK (position_type IN ('chilled', 'frozen', 'hot_holding', 'other')),
      current_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
      location_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Ensure unique nickname per site
      UNIQUE(site_id, nickname)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_site_equipment_positions_site 
      ON public.site_equipment_positions(site_id);
    CREATE INDEX IF NOT EXISTS idx_site_equipment_positions_company 
      ON public.site_equipment_positions(company_id);
    CREATE INDEX IF NOT EXISTS idx_site_equipment_positions_asset 
      ON public.site_equipment_positions(current_asset_id) 
      WHERE current_asset_id IS NOT NULL;

    -- ============================================================================
    -- 2. ADD position_id TO temperature_logs
    -- ============================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'temperature_logs') THEN
      -- Add position_id column (nullable for backwards compatibility)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'temperature_logs' 
        AND column_name = 'position_id'
      ) THEN
        ALTER TABLE public.temperature_logs 
        ADD COLUMN position_id UUID REFERENCES public.site_equipment_positions(id) ON DELETE SET NULL;
        
        -- Create index for fast lookups
        CREATE INDEX IF NOT EXISTS idx_temperature_logs_position 
          ON public.temperature_logs(position_id) 
          WHERE position_id IS NOT NULL;
        
        -- Backfill existing logs where we can match asset to position
        -- This will only work if positions already exist for assets
        UPDATE public.temperature_logs tl
        SET position_id = sep.id
        FROM public.site_equipment_positions sep
        WHERE tl.asset_id = sep.current_asset_id
          AND tl.position_id IS NULL
          AND sep.current_asset_id IS NOT NULL;
      END IF;
    END IF;

    -- ============================================================================
    -- 3. RLS POLICIES FOR site_equipment_positions
    -- ============================================================================
    ALTER TABLE public.site_equipment_positions ENABLE ROW LEVEL SECURITY;

    -- Select policy - users can see positions for their company
    DROP POLICY IF EXISTS site_equipment_positions_select_company ON public.site_equipment_positions;
    CREATE POLICY site_equipment_positions_select_company 
      ON public.site_equipment_positions
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() 
          AND p.company_id = site_equipment_positions.company_id
        )
      );

    -- Insert policy
    DROP POLICY IF EXISTS site_equipment_positions_insert_company ON public.site_equipment_positions;
    CREATE POLICY site_equipment_positions_insert_company 
      ON public.site_equipment_positions
      FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() 
          AND p.company_id = site_equipment_positions.company_id
        )
      );

    -- Update policy
    DROP POLICY IF EXISTS site_equipment_positions_update_company ON public.site_equipment_positions;
    CREATE POLICY site_equipment_positions_update_company 
      ON public.site_equipment_positions
      FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() 
          AND p.company_id = site_equipment_positions.company_id
        )
      );

    -- Delete policy
    DROP POLICY IF EXISTS site_equipment_positions_delete_company ON public.site_equipment_positions;
    CREATE POLICY site_equipment_positions_delete_company 
      ON public.site_equipment_positions
      FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() 
          AND p.company_id = site_equipment_positions.company_id
        )
      );

    -- ============================================================================
    -- 4. UPDATE TRIGGER FOR updated_at
    -- ============================================================================
    CREATE OR REPLACE FUNCTION update_site_equipment_positions_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_site_equipment_positions_updated_at ON public.site_equipment_positions;
    CREATE TRIGGER trg_site_equipment_positions_updated_at
      BEFORE UPDATE ON public.site_equipment_positions
      FOR EACH ROW
      EXECUTE FUNCTION update_site_equipment_positions_updated_at();

    RAISE NOTICE '✅ Created site_equipment_positions table with RLS policies and added position_id to temperature_logs';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, assets) do not exist yet - skipping site_equipment_positions';
  END IF;
END $$;
