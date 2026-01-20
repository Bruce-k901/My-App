-- ============================================================================
-- Migration: Create Stock Count System (Paper-First Workflow)
-- Description: Comprehensive stock count system with paper-based counting,
--              digital data entry, variance analysis, and stock adjustment
-- Date: 2025-02-11
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'companies') THEN

    -- ============================================================================
    -- STOCK COUNTS (Main event)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.stock_counts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name text NOT NULL,
      count_date date NOT NULL,
      frequency text CHECK (frequency IN ('weekly', 'monthly', 'adhoc')),
      status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'finalized', 'locked')),
      notes text,
      created_by uuid REFERENCES auth.users(id),
      created_at timestamptz DEFAULT now(),
      finalized_at timestamptz,
      finalized_by uuid REFERENCES auth.users(id),
      locked_at timestamptz,
      locked_by uuid REFERENCES auth.users(id),
      
      -- Summary fields (calculated)
      total_items integer DEFAULT 0,
      items_counted integer DEFAULT 0,
      variance_count integer DEFAULT 0,
      total_variance_value decimal(10,2) DEFAULT 0
    );

    -- ============================================================================
    -- STOCK COUNT AREAS (Storage areas included in count)
    -- ============================================================================
    -- Only create if storage_areas table exists (check both public and stockly schemas)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE (table_schema = 'public' AND table_name = 'storage_areas')
         OR (table_schema = 'stockly' AND table_name = 'storage_areas')
    ) THEN
      CREATE TABLE IF NOT EXISTS public.stock_count_areas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_count_id uuid NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
        storage_area_id uuid NOT NULL,
        status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        created_at timestamptz DEFAULT now(),
        
        UNIQUE(stock_count_id, storage_area_id)
      );

      -- Add foreign key to storage_areas (try both schemas)
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_areas_storage_area_id_fkey'
        ) THEN
          ALTER TABLE public.stock_count_areas
          ADD CONSTRAINT stock_count_areas_storage_area_id_fkey
          FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas(id) ON DELETE CASCADE;
        END IF;
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_areas_storage_area_id_fkey'
        ) THEN
          ALTER TABLE public.stock_count_areas
          ADD CONSTRAINT stock_count_areas_storage_area_id_fkey
          FOREIGN KEY (storage_area_id) REFERENCES stockly.storage_areas(id) ON DELETE CASCADE;
        END IF;
      END IF;
    END IF;

    -- ============================================================================
    -- STOCK COUNT ITEMS (Individual count items - line by line)
    -- ============================================================================
    -- Check for ingredients table (try ingredients_library first, then ingredients)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE (table_schema = 'public' AND table_name = 'ingredients_library')
         OR (table_schema = 'public' AND table_name = 'ingredients')
         OR (table_schema = 'stockly' AND table_name = 'ingredients')
    ) THEN
      CREATE TABLE IF NOT EXISTS public.stock_count_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_count_id uuid NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
        storage_area_id uuid NOT NULL,
        ingredient_id uuid NOT NULL,
        
        -- Stock movement columns (to be implemented later)
        opening_stock decimal(10,2),
        stock_in decimal(10,2) DEFAULT 0,
        sales decimal(10,2) DEFAULT 0,
        waste decimal(10,2) DEFAULT 0,
        transfers_in decimal(10,2) DEFAULT 0,
        transfers_out decimal(10,2) DEFAULT 0,
        theoretical_closing decimal(10,2),
        
        -- Count data
        counted_quantity decimal(10,2),
        variance_quantity decimal(10,2),
        variance_percentage decimal(5,2),
        variance_value decimal(10,2),
        
        -- Metadata
        unit_of_measurement text,
        unit_cost decimal(10,2),
        status text DEFAULT 'pending' CHECK (status IN ('pending', 'counted', 'skipped')),
        counted_at timestamptz,
        notes text,
        
        created_at timestamptz DEFAULT now(),
        
        UNIQUE(stock_count_id, ingredient_id)
      );

      -- Add foreign key to storage_areas
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_items_storage_area_id_fkey'
        ) THEN
          ALTER TABLE public.stock_count_items
          ADD CONSTRAINT stock_count_items_storage_area_id_fkey
          FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas(id) ON DELETE CASCADE;
        END IF;
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_items_storage_area_id_fkey'
        ) THEN
          ALTER TABLE public.stock_count_items
          ADD CONSTRAINT stock_count_items_storage_area_id_fkey
          FOREIGN KEY (storage_area_id) REFERENCES stockly.storage_areas(id) ON DELETE CASCADE;
        END IF;
      END IF;

      -- Add foreign key to ingredients (try different table names)
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_items_ingredient_id_fkey'
        ) THEN
          ALTER TABLE public.stock_count_items
          ADD CONSTRAINT stock_count_items_ingredient_id_fkey
          FOREIGN KEY (ingredient_id) REFERENCES public.ingredients_library(id) ON DELETE CASCADE;
        END IF;
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'ingredients') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_items_ingredient_id_fkey'
        ) THEN
          ALTER TABLE public.stock_count_items
          ADD CONSTRAINT stock_count_items_ingredient_id_fkey
          FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;
        END IF;
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'stockly' AND table_name = 'ingredients') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_items_ingredient_id_fkey'
        ) THEN
          ALTER TABLE public.stock_count_items
          ADD CONSTRAINT stock_count_items_ingredient_id_fkey
          FOREIGN KEY (ingredient_id) REFERENCES stockly.ingredients(id) ON DELETE CASCADE;
        END IF;
      END IF;
    END IF;

    -- ============================================================================
    -- STOCK COUNT SCHEDULES (Recurring schedules - for future implementation)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.stock_count_schedules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name text NOT NULL,
      frequency text NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
      day_of_week integer, -- 0-6 for weekly
      day_of_month integer, -- 1-31 for monthly
      storage_area_ids uuid[], -- Array of storage area IDs
      is_active boolean DEFAULT true,
      last_generated_at timestamptz,
      next_generation_date date,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- ============================================================================
    -- INDEXES
    -- ============================================================================
    CREATE INDEX IF NOT EXISTS idx_stock_counts_company ON stock_counts(company_id);
    CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);
    CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(count_date);
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_areas') THEN
      CREATE INDEX IF NOT EXISTS idx_stock_count_areas_count ON stock_count_areas(stock_count_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
      CREATE INDEX IF NOT EXISTS idx_stock_count_items_count ON stock_count_items(stock_count_id);
      CREATE INDEX IF NOT EXISTS idx_stock_count_items_ingredient ON stock_count_items(ingredient_id);
    END IF;

    -- ============================================================================
    -- ROW LEVEL SECURITY
    -- ============================================================================
    ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_areas') THEN
      ALTER TABLE stock_count_areas ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
      ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
    END IF;
    
    ALTER TABLE stock_count_schedules ENABLE ROW LEVEL SECURITY;

    -- ============================================================================
    -- RLS POLICIES FOR STOCK_COUNTS
    -- ============================================================================
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their company's stock counts" ON stock_counts;
    DROP POLICY IF EXISTS "Users can manage their company's stock counts" ON stock_counts;

    -- Check if user_companies table exists (for RLS policies)
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'user_companies') THEN
      CREATE POLICY "Users can view their company's stock counts"
        ON stock_counts FOR SELECT
        USING (company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        ));

      CREATE POLICY "Users can manage their company's stock counts"
        ON stock_counts FOR ALL
        USING (company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        ));
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      -- Fallback to profiles table if user_companies doesn't exist
      CREATE POLICY "Users can view their company's stock counts"
        ON stock_counts FOR SELECT
        USING (company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        ));

      CREATE POLICY "Users can manage their company's stock counts"
        ON stock_counts FOR ALL
        USING (company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        ));
    END IF;

    -- ============================================================================
    -- RLS POLICIES FOR STOCK_COUNT_AREAS
    -- ============================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_areas') THEN
      DROP POLICY IF EXISTS "Users can view their company's stock count areas" ON stock_count_areas;
      DROP POLICY IF EXISTS "Users can manage their company's stock count areas" ON stock_count_areas;

      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'user_companies') THEN
        CREATE POLICY "Users can view their company's stock count areas"
          ON stock_count_areas FOR SELECT
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM user_companies WHERE user_id = auth.uid()
            )
          ));

        CREATE POLICY "Users can manage their company's stock count areas"
          ON stock_count_areas FOR ALL
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM user_companies WHERE user_id = auth.uid()
            )
          ));
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE POLICY "Users can view their company's stock count areas"
          ON stock_count_areas FOR SELECT
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM profiles WHERE id = auth.uid()
            )
          ));

        CREATE POLICY "Users can manage their company's stock count areas"
          ON stock_count_areas FOR ALL
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM profiles WHERE id = auth.uid()
            )
          ));
      END IF;
    END IF;

    -- ============================================================================
    -- RLS POLICIES FOR STOCK_COUNT_ITEMS
    -- ============================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
      DROP POLICY IF EXISTS "Users can view their company's stock count items" ON stock_count_items;
      DROP POLICY IF EXISTS "Users can manage their company's stock count items" ON stock_count_items;

      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'user_companies') THEN
        CREATE POLICY "Users can view their company's stock count items"
          ON stock_count_items FOR SELECT
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM user_companies WHERE user_id = auth.uid()
            )
          ));

        CREATE POLICY "Users can manage their company's stock count items"
          ON stock_count_items FOR ALL
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM user_companies WHERE user_id = auth.uid()
            )
          ));
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE POLICY "Users can view their company's stock count items"
          ON stock_count_items FOR SELECT
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM profiles WHERE id = auth.uid()
            )
          ));

        CREATE POLICY "Users can manage their company's stock count items"
          ON stock_count_items FOR ALL
          USING (stock_count_id IN (
            SELECT id FROM stock_counts WHERE company_id IN (
              SELECT company_id FROM profiles WHERE id = auth.uid()
            )
          ));
      END IF;
    END IF;

    -- ============================================================================
    -- RLS POLICIES FOR STOCK_COUNT_SCHEDULES
    -- ============================================================================
    DROP POLICY IF EXISTS "Users can view their company's schedules" ON stock_count_schedules;
    DROP POLICY IF EXISTS "Users can manage their company's schedules" ON stock_count_schedules;

    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'user_companies') THEN
      CREATE POLICY "Users can view their company's schedules"
        ON stock_count_schedules FOR SELECT
        USING (company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        ));

      CREATE POLICY "Users can manage their company's schedules"
        ON stock_count_schedules FOR ALL
        USING (company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        ));
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY "Users can view their company's schedules"
        ON stock_count_schedules FOR SELECT
        USING (company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        ));

      CREATE POLICY "Users can manage their company's schedules"
        ON stock_count_schedules FOR ALL
        USING (company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        ));
    END IF;

    -- ============================================================================
    -- FUNCTION: Update summary fields on stock_counts
    -- ============================================================================
    CREATE OR REPLACE FUNCTION update_stock_count_summary()
    RETURNS TRIGGER AS $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
        UPDATE stock_counts
        SET 
          total_items = (
            SELECT COUNT(*) FROM stock_count_items WHERE stock_count_id = NEW.stock_count_id
          ),
          items_counted = (
            SELECT COUNT(*) FROM stock_count_items 
            WHERE stock_count_id = NEW.stock_count_id AND status = 'counted'
          ),
          variance_count = (
            SELECT COUNT(*) FROM stock_count_items 
            WHERE stock_count_id = NEW.stock_count_id 
            AND status = 'counted' 
            AND ABS(variance_quantity) > 0
          ),
          total_variance_value = (
            SELECT COALESCE(SUM(variance_value), 0) FROM stock_count_items 
            WHERE stock_count_id = NEW.stock_count_id AND status = 'counted'
          )
        WHERE id = NEW.stock_count_id;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- ============================================================================
    -- TRIGGER: Update summary on stock_count_items changes
    -- ============================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
      DROP TRIGGER IF EXISTS update_count_summary_trigger ON stock_count_items;
      CREATE TRIGGER update_count_summary_trigger
        AFTER INSERT OR UPDATE ON stock_count_items
        FOR EACH ROW
        EXECUTE FUNCTION update_stock_count_summary();
    END IF;

    -- ============================================================================
    -- TRIGGERS: Update updated_at columns
    -- ============================================================================
    -- Check if update_updated_at_column function exists
    IF EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'update_updated_at_column'
    ) THEN
      DROP TRIGGER IF EXISTS update_stock_counts_updated_at ON stock_counts;
      CREATE TRIGGER update_stock_counts_updated_at
        BEFORE UPDATE ON stock_counts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_stock_count_schedules_updated_at ON stock_count_schedules;
      CREATE TRIGGER update_stock_count_schedules_updated_at
        BEFORE UPDATE ON stock_count_schedules
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- ============================================================================
    -- COMMENTS
    -- ============================================================================
    COMMENT ON TABLE stock_counts IS 'Main stock counting events';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_areas') THEN
      COMMENT ON TABLE stock_count_areas IS 'Storage areas included in each count';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
      COMMENT ON TABLE stock_count_items IS 'Individual ingredient counts with variance tracking';
    END IF;
    
    COMMENT ON TABLE stock_count_schedules IS 'Recurring stock count schedules';

  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping stock counts system creation';
  END IF;
END $$;

