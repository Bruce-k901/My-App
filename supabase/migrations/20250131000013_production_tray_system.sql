-- Migration: Production Tray System
-- Description: Adds tray assignment capability for physical production planning
-- This enables tray-by-tray production planning matching real bakery workflows

-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_suppliers'
  ) THEN
    RAISE NOTICE 'order_book_suppliers table does not exist - skipping production_tray_system migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'order_book_suppliers table found - proceeding with production_tray_system migration';
END $$;

-- Only proceed if required tables exist (checked above)
DO $$
BEGIN
  -- Check if order_book_suppliers table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_suppliers'
  ) THEN
    RETURN;
  END IF;

  -- ============================================================================
  -- STEP 1: Add tray capacity to production profiles
  -- ============================================================================
  -- Only alter if order_book_production_profiles exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_production_profiles'
  ) THEN
    -- Add items_per_tray column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_production_profiles' 
      AND column_name = 'items_per_tray'
    ) THEN
      ALTER TABLE public.order_book_production_profiles
      ADD COLUMN items_per_tray INTEGER DEFAULT 18;
      
      COMMENT ON COLUMN public.order_book_production_profiles.items_per_tray IS 
        'Number of items that fit on one standard oven tray (physical constraint)';
    END IF;

    -- Add tray_type column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_production_profiles' 
      AND column_name = 'tray_type'
    ) THEN
      ALTER TABLE public.order_book_production_profiles
      ADD COLUMN tray_type TEXT DEFAULT 'standard' CHECK (tray_type IN ('standard', 'half', 'sheet', 'custom'));
      
      COMMENT ON COLUMN public.order_book_production_profiles.tray_type IS 
        'Type of tray used (standard = full tray, half = half tray, sheet = sheet pan, custom = custom size)';
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 2: Create production trays table
  -- ============================================================================
  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS public.order_book_production_trays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  supplier_id UUID NOT NULL,
  production_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  production_stream TEXT NOT NULL DEFAULT 'wholesale' CHECK (production_stream IN ('wholesale', 'kiosk', 'both')),
  
  -- Tray identification
  tray_number INTEGER NOT NULL,
  equipment_id UUID, -- Which oven/equipment this tray goes in
  
  -- Batch information
  batch_number INTEGER, -- Which bake batch (1st, 2nd, 3rd, etc.)
  batch_start_time TIMESTAMPTZ,
  
  -- What's on this tray
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [
  --   {
  --     "product_id": "uuid",
  --     "product_name": "Croissant",
  --     "quantity": 18,
  --     "items_per_tray": 18
  --   }
  -- ]
  
  -- Capacity tracking
  tray_capacity INTEGER, -- Max items per tray (usually from production profile)
  items_assigned INTEGER DEFAULT 0, -- Total items on this tray
  utilization_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN tray_capacity > 0 
      THEN ROUND((items_assigned::DECIMAL / tray_capacity * 100), 2)
      ELSE 0
    END
  ) STORED,
  
  -- Bake parameters (for grouping compatible products)
  bake_temp INTEGER, -- Celsius (optional - for grouping compatible products)
  bake_duration INTEGER, -- minutes (from production profile)
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
      -- Constraints
      UNIQUE(supplier_id, production_date, delivery_date, production_stream, tray_number)
    );
  $sql_table1$;

    -- Add foreign key conditionally
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_production_trays'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_production_trays_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_production_trays'
    ) THEN
      ALTER TABLE public.order_book_production_trays
      ADD CONSTRAINT order_book_production_trays_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_equipment') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_book_production_trays_equipment_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'order_book_production_trays'
      ) THEN
        ALTER TABLE public.order_book_production_trays
        ADD CONSTRAINT order_book_production_trays_equipment_id_fkey
        FOREIGN KEY (equipment_id) REFERENCES public.order_book_equipment(id) ON DELETE SET NULL;
      END IF;
    END IF;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_production_trays_supplier_date 
      ON public.order_book_production_trays(supplier_id, production_date, delivery_date);

    CREATE INDEX IF NOT EXISTS idx_production_trays_stream 
      ON public.order_book_production_trays(supplier_id, delivery_date, production_stream);

    CREATE INDEX IF NOT EXISTS idx_production_trays_batch 
      ON public.order_book_production_trays(supplier_id, production_date, batch_number);
  END IF;

  -- ============================================================================
  -- STEP 3: Function to generate tray plan
  -- ============================================================================
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION public.generate_tray_plan(
      p_supplier_id UUID,
      p_delivery_date DATE,
      p_stream TEXT DEFAULT 'wholesale'
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    AS $func$
    DECLARE
      v_products RECORD;
      v_tray_number INTEGER := 1;
      v_tray_assignments JSONB := '[]'::jsonb;
      v_items_remaining DECIMAL(10,2);
      v_items_this_tray INTEGER;
      v_tray_item JSONB;
    BEGIN
      -- Get all products needed for this delivery date
      FOR v_products IN
        SELECT 
          p.id AS product_id,
          p.name AS product_name,
          SUM(oi.quantity)::DECIMAL(10,2) AS total_quantity,
          COALESCE(pp.items_per_tray, 18) AS items_per_tray,
          pp.bake_time_minutes AS bake_duration
        FROM public.order_book_orders o
        JOIN public.order_book_order_items oi ON oi.order_id = o.id
        JOIN public.order_book_products p ON p.id = oi.product_id
        LEFT JOIN public.order_book_production_profiles pp ON pp.product_id = p.id AND pp.supplier_id = p_supplier_id
        WHERE o.supplier_id = p_supplier_id
          AND o.delivery_date = p_delivery_date
          AND o.status IN ('confirmed', 'locked', 'in_production')
        GROUP BY p.id, p.name, pp.items_per_tray, pp.bake_time_minutes
        ORDER BY COALESCE(pp.bake_time_minutes, 20)
      LOOP
        v_items_remaining := v_products.total_quantity;
        
        -- Assign to trays
        WHILE v_items_remaining > 0 LOOP
          v_items_this_tray := LEAST(v_items_remaining::INTEGER, v_products.items_per_tray);
          
          v_tray_item := jsonb_build_object(
            'tray_number', v_tray_number,
            'product_id', v_products.product_id,
            'product_name', v_products.product_name,
            'quantity', v_items_this_tray,
            'capacity', v_products.items_per_tray,
            'utilization', ROUND((v_items_this_tray::DECIMAL / v_products.items_per_tray * 100), 2),
            'bake_duration', v_products.bake_duration
          );
          
          v_tray_assignments := v_tray_assignments || v_tray_item;
          
          v_items_remaining := v_items_remaining - v_items_this_tray;
          v_tray_number := v_tray_number + 1;
        END LOOP;
      END LOOP;
      
      RETURN jsonb_build_object(
        'delivery_date', p_delivery_date,
        'stream', p_stream,
        'total_trays', v_tray_number - 1,
        'tray_assignments', v_tray_assignments
      );
    END;
    $func$;
  $sql_func1$;

  COMMENT ON FUNCTION public.generate_tray_plan(UUID, DATE, TEXT) IS 
    'Generates a tray packing plan for a delivery date. Returns JSONB with tray assignments.';

  -- Grant execute permission
  GRANT EXECUTE ON FUNCTION public.generate_tray_plan(UUID, DATE, TEXT) TO authenticated;

  -- ============================================================================
  -- STEP 5: RLS Policies for production_trays table
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_production_trays') THEN
    ALTER TABLE public.order_book_production_trays ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS order_book_production_trays_select ON public.order_book_production_trays;
    DROP POLICY IF EXISTS order_book_production_trays_insert ON public.order_book_production_trays;
    DROP POLICY IF EXISTS order_book_production_trays_update ON public.order_book_production_trays;
    DROP POLICY IF EXISTS order_book_production_trays_delete ON public.order_book_production_trays;
    
    -- Suppliers can view their own production trays
    CREATE POLICY order_book_production_trays_select ON public.order_book_production_trays
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_production_trays.supplier_id
            AND p.id = auth.uid()
        )
      );
    
    -- Suppliers can insert their own production trays
    CREATE POLICY order_book_production_trays_insert ON public.order_book_production_trays
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_production_trays.supplier_id
            AND p.id = auth.uid()
        )
      );
    
    -- Suppliers can update their own production trays
    CREATE POLICY order_book_production_trays_update ON public.order_book_production_trays
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_production_trays.supplier_id
            AND p.id = auth.uid()
        )
      );
    
    -- Suppliers can delete their own production trays
    CREATE POLICY order_book_production_trays_delete ON public.order_book_production_trays
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_production_trays.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  -- ============================================================================
  -- STEP 4: Update trigger for updated_at
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_production_trays') THEN
    EXECUTE $sql_func2$
      CREATE OR REPLACE FUNCTION public.update_production_trays_updated_at()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
    $sql_func2$;

    DROP TRIGGER IF EXISTS trigger_update_production_trays_updated_at ON public.order_book_production_trays;
    CREATE TRIGGER trigger_update_production_trays_updated_at
      BEFORE UPDATE ON public.order_book_production_trays
      FOR EACH ROW
      EXECUTE FUNCTION public.update_production_trays_updated_at();
  END IF;

END $$;

