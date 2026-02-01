-- ============================================================================
-- Migration: 20250321000008_create_recipe_outputs.sql
-- Description: Creates recipe_outputs table for products made from recipes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    -- Create recipe_outputs table
    CREATE TABLE IF NOT EXISTS recipe_outputs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
      
      -- Product Details
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      
      -- Recipe Link (NULL if this is a purchased finished good)
      recipe_id UUID,
      source_type TEXT DEFAULT 'recipe' CHECK (source_type IN ('recipe', 'purchased')),
      
      -- Unit of Measure
      base_unit TEXT NOT NULL,
      
      -- Stock Tracking
      track_stock BOOLEAN DEFAULT true,
      current_stock NUMERIC DEFAULT 0,
      par_level NUMERIC,
      reorder_point NUMERIC,
      reorder_qty NUMERIC,
      low_stock_alert BOOLEAN DEFAULT false,
      last_stock_count_date TIMESTAMPTZ,
      
      -- Costing
      calculated_cost NUMERIC,
      manual_cost NUMERIC,
      cost_method TEXT DEFAULT 'calculated' CHECK (cost_method IN ('calculated', 'manual')),
      stock_value NUMERIC DEFAULT 0,
      
      -- Pricing
      sale_price NUMERIC NOT NULL,
      margin_percent NUMERIC GENERATED ALWAYS AS (
        CASE 
          WHEN COALESCE(calculated_cost, manual_cost, 0) > 0 
          THEN ((sale_price - COALESCE(calculated_cost, manual_cost)) / sale_price * 100)
          ELSE NULL
        END
      ) STORED,
      
      -- Production
      production_time_minutes INTEGER,
      batch_size NUMERIC,
      shelf_life_days INTEGER,
      
      -- Product Info
      sku TEXT,
      barcode TEXT,
      image_url TEXT,
      allergens TEXT[],
      dietary_info TEXT[],
      
      -- Metadata
      is_active BOOLEAN DEFAULT true,
      is_saleable BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      
      CONSTRAINT recipe_outputs_company_name_unique UNIQUE(company_id, name)
    );

    -- Add foreign key to recipes if recipes table exists in public schema
    -- Note: FK constraints cannot be added conditionally in DO blocks, so we check first
    -- and only add if recipes table exists as a TABLE (not a view)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'recipes'
      AND table_type = 'BASE TABLE'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipe_outputs_recipe_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'recipe_outputs'
      ) THEN
        BEGIN
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (recipe_id) REFERENCES %I.%I(id) ON DELETE SET NULL',
            'public', 'recipe_outputs', 'recipe_outputs_recipe_id_fkey', 'public', 'recipes');
        EXCEPTION WHEN OTHERS THEN
          -- Constraint failed to add - ignore error
          NULL;
        END;
      END IF;
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_recipe_outputs_company ON recipe_outputs(company_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_outputs_recipe ON recipe_outputs(recipe_id) WHERE recipe_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_recipe_outputs_low_stock ON recipe_outputs(company_id, low_stock_alert) WHERE low_stock_alert = true;
    CREATE INDEX IF NOT EXISTS idx_recipe_outputs_active ON recipe_outputs(company_id, is_active) WHERE is_active = true;

    -- Trigger for updated_at
    DROP TRIGGER IF EXISTS set_recipe_outputs_updated_at ON recipe_outputs;
    CREATE TRIGGER set_recipe_outputs_updated_at
      BEFORE UPDATE ON recipe_outputs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    -- Trigger for low stock alert
    DROP TRIGGER IF EXISTS trg_recipe_outputs_low_stock ON recipe_outputs;
    CREATE TRIGGER trg_recipe_outputs_low_stock
      BEFORE INSERT OR UPDATE OF current_stock, reorder_point, track_stock
      ON recipe_outputs
      FOR EACH ROW
      EXECUTE FUNCTION update_low_stock_alert();

    -- RLS Policies
    ALTER TABLE recipe_outputs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view recipe outputs for their company" ON recipe_outputs;
    CREATE POLICY "Users can view recipe outputs for their company"
      ON recipe_outputs FOR SELECT
      USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      ));

    DROP POLICY IF EXISTS "Users can insert recipe outputs for their company" ON recipe_outputs;
    CREATE POLICY "Users can insert recipe outputs for their company"
      ON recipe_outputs FOR INSERT
      WITH CHECK (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      ));

    DROP POLICY IF EXISTS "Users can update recipe outputs for their company" ON recipe_outputs;
    CREATE POLICY "Users can update recipe outputs for their company"
      ON recipe_outputs FOR UPDATE
      USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      ));

    DROP POLICY IF EXISTS "Users can delete recipe outputs for their company" ON recipe_outputs;
    CREATE POLICY "Users can delete recipe outputs for their company"
      ON recipe_outputs FOR DELETE
      USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      ));

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_outputs TO authenticated;
  END IF;
END $$;

