-- ============================================================================
-- Migration: Multi-Site Library-Based Stock Management
-- Description: Enables multi-site stock management using library items directly
--              Adds missing columns to libraries, creates library-based stock
--              levels, transactions, and reporting views for GP calculations
-- Date: 2025-02-12
-- ============================================================================

DO $$
DECLARE
  v_sql TEXT := '';
  has_ingredients BOOLEAN := FALSE;
  has_packaging BOOLEAN := FALSE;
  has_foh BOOLEAN := FALSE;
BEGIN
  -- Only proceed if companies and sites tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- ============================================================================
    -- PART 1: UPDATE LIBRARY TABLES - Add Missing Columns
    -- ============================================================================

    -- Update ingredients_library
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
      -- Add is_saleable
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ingredients_library' 
        AND column_name = 'is_saleable'
      ) THEN
        ALTER TABLE ingredients_library 
        ADD COLUMN is_saleable BOOLEAN DEFAULT false;
      END IF;

      -- Add selling_price
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ingredients_library' 
        AND column_name = 'selling_price'
      ) THEN
        ALTER TABLE ingredients_library 
        ADD COLUMN selling_price DECIMAL(10,2);
      END IF;

      -- Ensure unit_of_measurement exists (might be 'unit' column)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ingredients_library' 
        AND column_name = 'unit_of_measurement'
      ) THEN
        -- Check if 'unit' column exists, if so use it as base
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'ingredients_library' 
          AND column_name = 'unit'
        ) THEN
          -- Add unit_of_measurement and populate from unit
          ALTER TABLE ingredients_library 
          ADD COLUMN unit_of_measurement TEXT;
          
          UPDATE ingredients_library 
          SET unit_of_measurement = COALESCE(unit, 'each') 
          WHERE unit_of_measurement IS NULL;
        ELSE
          ALTER TABLE ingredients_library 
          ADD COLUMN unit_of_measurement TEXT NOT NULL DEFAULT 'each';
        END IF;
      END IF;
    END IF;

    -- Update packaging_library
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'packaging_library') THEN
      -- Add is_saleable
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'packaging_library' 
        AND column_name = 'is_saleable'
      ) THEN
        ALTER TABLE packaging_library 
        ADD COLUMN is_saleable BOOLEAN DEFAULT false;
      END IF;

      -- Add selling_price
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'packaging_library' 
        AND column_name = 'selling_price'
      ) THEN
        ALTER TABLE packaging_library 
        ADD COLUMN selling_price DECIMAL(10,2);
      END IF;

      -- Add unit_of_measurement (might be missing)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'packaging_library' 
        AND column_name = 'unit_of_measurement'
      ) THEN
        ALTER TABLE packaging_library 
        ADD COLUMN unit_of_measurement TEXT NOT NULL DEFAULT 'each';
      END IF;

      -- Ensure unit_cost exists (might be unit_cost already)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'packaging_library' 
        AND column_name = 'cost_per_unit'
      ) THEN
        -- Check if unit_cost exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'packaging_library' 
          AND column_name = 'unit_cost'
        ) THEN
          -- Add cost_per_unit and populate from unit_cost
          ALTER TABLE packaging_library 
          ADD COLUMN cost_per_unit DECIMAL(10,2);
          
          UPDATE packaging_library 
          SET cost_per_unit = unit_cost 
          WHERE cost_per_unit IS NULL;
        ELSE
          ALTER TABLE packaging_library 
          ADD COLUMN cost_per_unit DECIMAL(10,2);
        END IF;
      END IF;
    END IF;

    -- Update serving_equipment_library (FOH items)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'serving_equipment_library') THEN
      -- Add is_saleable
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'serving_equipment_library' 
        AND column_name = 'is_saleable'
      ) THEN
        ALTER TABLE serving_equipment_library 
        ADD COLUMN is_saleable BOOLEAN DEFAULT false;
      END IF;

      -- Add selling_price
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'serving_equipment_library' 
        AND column_name = 'selling_price'
      ) THEN
        ALTER TABLE serving_equipment_library 
        ADD COLUMN selling_price DECIMAL(10,2);
      END IF;

      -- Add unit_of_measurement
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'serving_equipment_library' 
        AND column_name = 'unit_of_measurement'
      ) THEN
        ALTER TABLE serving_equipment_library 
        ADD COLUMN unit_of_measurement TEXT NOT NULL DEFAULT 'each';
      END IF;

      -- Ensure cost_per_unit exists (might be unit_cost)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'serving_equipment_library' 
        AND column_name = 'cost_per_unit'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'serving_equipment_library' 
          AND column_name = 'unit_cost'
        ) THEN
          ALTER TABLE serving_equipment_library 
          ADD COLUMN cost_per_unit DECIMAL(10,2);
          
          UPDATE serving_equipment_library 
          SET cost_per_unit = unit_cost 
          WHERE cost_per_unit IS NULL;
        ELSE
          ALTER TABLE serving_equipment_library 
          ADD COLUMN cost_per_unit DECIMAL(10,2);
        END IF;
      END IF;
    END IF;

    -- Update first_aid_supplies_library
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'first_aid_supplies_library') THEN
      -- First aid items are typically not saleable, but add the field for consistency
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'first_aid_supplies_library' 
        AND column_name = 'is_saleable'
      ) THEN
        ALTER TABLE first_aid_supplies_library 
        ADD COLUMN is_saleable BOOLEAN DEFAULT false;
      END IF;

      -- Add unit_of_measurement
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'first_aid_supplies_library' 
        AND column_name = 'unit_of_measurement'
      ) THEN
        ALTER TABLE first_aid_supplies_library 
        ADD COLUMN unit_of_measurement TEXT NOT NULL DEFAULT 'each';
      END IF;

      -- Ensure cost_per_unit exists (might be unit_cost)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'first_aid_supplies_library' 
        AND column_name = 'cost_per_unit'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'first_aid_supplies_library' 
          AND column_name = 'unit_cost'
        ) THEN
          ALTER TABLE first_aid_supplies_library 
          ADD COLUMN cost_per_unit DECIMAL(10,2);
          
          UPDATE first_aid_supplies_library 
          SET cost_per_unit = unit_cost 
          WHERE cost_per_unit IS NULL;
        ELSE
          ALTER TABLE first_aid_supplies_library 
          ADD COLUMN cost_per_unit DECIMAL(10,2);
        END IF;
      END IF;
    END IF;

    -- ============================================================================
    -- PART 2: CREATE LIBRARY-BASED STOCK LEVELS TABLE
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS library_stock_levels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Site reference (from Checkly's sites table)
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      
      -- Item reference (polymorphic - can be any library)
      item_id UUID NOT NULL,
      library_type TEXT NOT NULL CHECK (library_type IN ('ingredients', 'packaging', 'foh', 'first_aid')),
      
      -- Stock data
      current_level DECIMAL(10,2) DEFAULT 0,
      min_level DECIMAL(10,2),
      max_level DECIMAL(10,2),
      
      -- Costing
      average_cost DECIMAL(10,2),
      last_cost DECIMAL(10,2),
      
      -- Tracking
      last_counted_at TIMESTAMPTZ,
      last_updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(site_id, item_id, library_type)
    );

    CREATE INDEX IF NOT EXISTS idx_library_stock_levels_site ON library_stock_levels(site_id);
    CREATE INDEX IF NOT EXISTS idx_library_stock_levels_item ON library_stock_levels(item_id, library_type);
    CREATE INDEX IF NOT EXISTS idx_library_stock_levels_type ON library_stock_levels(library_type);

    -- Add comment
    COMMENT ON TABLE library_stock_levels IS 'Stock levels per site for library items (ingredients, packaging, FOH, first aid)';
    COMMENT ON COLUMN library_stock_levels.library_type IS 'Type of library: ingredients, packaging, foh, first_aid';
    COMMENT ON COLUMN library_stock_levels.item_id IS 'ID from the respective library table';

    -- ============================================================================
    -- PART 3: CREATE LIBRARY-BASED STOCK TRANSACTIONS TABLE
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS library_stock_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      
      item_id UUID NOT NULL,
      library_type TEXT NOT NULL CHECK (library_type IN ('ingredients', 'packaging', 'foh', 'first_aid')),
      
      transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'stock_count',
        'purchase',
        'sale',
        'production',
        'waste',
        'transfer_out',
        'transfer_in',
        'adjustment'
      )),
      
      quantity DECIMAL(10,2) NOT NULL,
      unit_cost DECIMAL(10,2),
      total_value DECIMAL(10,2),
      
      -- Reference to source record
      reference_type TEXT,
      reference_id UUID,
      
      -- Transfer specific
      from_site_id UUID REFERENCES sites(id),
      to_site_id UUID REFERENCES sites(id),
      
      notes TEXT,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      
      balance_after DECIMAL(10,2)
    );

    CREATE INDEX IF NOT EXISTS idx_library_stock_transactions_site ON library_stock_transactions(site_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_library_stock_transactions_item ON library_stock_transactions(item_id, library_type);
    CREATE INDEX IF NOT EXISTS idx_library_stock_transactions_type ON library_stock_transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_library_stock_transactions_reference ON library_stock_transactions(reference_type, reference_id);

    -- Add comments
    COMMENT ON TABLE library_stock_transactions IS 'All stock movements for library items (audit trail)';
    COMMENT ON COLUMN library_stock_transactions.transaction_type IS 'Type of transaction: stock_count, purchase, sale, production, waste, transfer_out, transfer_in, adjustment';

    -- ============================================================================
    -- PART 4: ENSURE STOCK_COUNTS HAS SITE_ID
    -- ============================================================================

    -- Check if stock_counts exists and add site_id if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_counts' 
        AND column_name = 'site_id'
      ) THEN
        ALTER TABLE stock_counts 
        ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_stock_counts_site ON stock_counts(site_id);
      END IF;
    END IF;

    -- ============================================================================
    -- PART 5: CREATE LIBRARY-BASED STOCK TRANSFERS (if not exists)
    -- ============================================================================

    -- Note: This is a simpler version that works with library items directly
    -- The existing stock_transfers in stockly schema uses stock_item_id
    
    CREATE TABLE IF NOT EXISTS library_stock_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      
      from_site_id UUID NOT NULL REFERENCES sites(id),
      to_site_id UUID NOT NULL REFERENCES sites(id),
      
      transfer_number TEXT, -- Auto-generated like "TR-2026-001"
      
      status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',
        'sent',
        'in_transit',
        'received',
        'cancelled'
      )),
      
      transfer_type TEXT CHECK (transfer_type IN ('transfer', 'sale')),
      
      -- Financials (if sale)
      total_cost DECIMAL(10,2),
      total_sale_value DECIMAL(10,2),
      
      -- Workflow
      sent_at TIMESTAMPTZ,
      sent_by UUID REFERENCES auth.users(id),
      received_at TIMESTAMPTZ,
      received_by UUID REFERENCES auth.users(id),
      
      notes TEXT,
      
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      CHECK (from_site_id != to_site_id)
    );

    CREATE TABLE IF NOT EXISTS library_stock_transfer_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transfer_id UUID NOT NULL REFERENCES library_stock_transfers(id) ON DELETE CASCADE,
      
      item_id UUID NOT NULL,
      library_type TEXT NOT NULL CHECK (library_type IN ('ingredients', 'packaging', 'foh', 'first_aid')),
      
      quantity_sent DECIMAL(10,2) NOT NULL,
      quantity_received DECIMAL(10,2),
      
      unit_cost DECIMAL(10,2),
      unit_price DECIMAL(10,2),
      
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_library_stock_transfers_from_site ON library_stock_transfers(from_site_id);
    CREATE INDEX IF NOT EXISTS idx_library_stock_transfers_to_site ON library_stock_transfers(to_site_id);
    CREATE INDEX IF NOT EXISTS idx_library_stock_transfers_status ON library_stock_transfers(status);
    CREATE INDEX IF NOT EXISTS idx_library_stock_transfer_items_transfer ON library_stock_transfer_items(transfer_id);
    CREATE INDEX IF NOT EXISTS idx_library_stock_transfer_items_item ON library_stock_transfer_items(item_id, library_type);

    -- ============================================================================
    -- PART 6: CREATE REPORTING VIEWS
    -- ============================================================================

    -- Stock on hand by site (simple summary)
    DROP VIEW IF EXISTS stock_on_hand_by_site;
    CREATE VIEW stock_on_hand_by_site AS
    SELECT 
      s.id as site_id,
      s.name as site_name,
      sl.library_type,
      COUNT(DISTINCT sl.item_id) as item_count,
      SUM(sl.current_level) as total_quantity,
      SUM(sl.current_level * COALESCE(sl.average_cost, 0)) as total_value
    FROM sites s
    LEFT JOIN library_stock_levels sl ON sl.site_id = s.id
    GROUP BY s.id, s.name, sl.library_type;

    -- GP by site (saleable items only) - Create view with conditional UNION ALL parts
    DROP VIEW IF EXISTS gp_by_site;
    
    -- Check which libraries exist and have required columns
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'ingredients_library'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ingredients_library' 
      AND column_name IN ('selling_price', 'is_saleable')
    ) INTO has_ingredients;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'packaging_library'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'packaging_library' 
      AND column_name IN ('selling_price', 'is_saleable')
    ) INTO has_packaging;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'serving_equipment_library'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'serving_equipment_library' 
      AND column_name IN ('selling_price', 'is_saleable')
    ) INTO has_foh;
    
    -- Build SQL only if at least one library exists
    IF has_ingredients OR has_packaging OR has_foh THEN
      v_sql := 'CREATE VIEW gp_by_site AS ';
      
      IF has_ingredients THEN
        v_sql := v_sql || '
          SELECT 
            s.id as site_id,
            s.name as site_name,
            ''ingredients'' as library_type,
            i.id as item_id,
            i.ingredient_name as item_name,
            sl.current_level,
            sl.average_cost,
            i.selling_price,
            CASE 
              WHEN i.selling_price > 0 AND sl.average_cost > 0
              THEN ((i.selling_price - sl.average_cost) / i.selling_price * 100)
              ELSE NULL
            END as gp_percentage,
            CASE 
              WHEN i.selling_price > 0 AND sl.average_cost > 0
              THEN (i.selling_price - sl.average_cost) * sl.current_level
              ELSE NULL
            END as gp_value
          FROM sites s
          JOIN library_stock_levels sl ON sl.site_id = s.id AND sl.library_type = ''ingredients''
          JOIN ingredients_library i ON i.id = sl.item_id AND i.is_saleable = true
          WHERE sl.current_level > 0';
      END IF;
      
      IF has_packaging THEN
        IF has_ingredients THEN
          v_sql := v_sql || ' UNION ALL';
        END IF;
        v_sql := v_sql || '
          SELECT 
            s.id,
            s.name,
            ''packaging'',
            p.id,
            p.item_name,
            sl.current_level,
            sl.average_cost,
            p.selling_price,
            CASE 
              WHEN p.selling_price > 0 AND sl.average_cost > 0
              THEN ((p.selling_price - sl.average_cost) / p.selling_price * 100)
              ELSE NULL
            END,
            CASE 
              WHEN p.selling_price > 0 AND sl.average_cost > 0
              THEN (p.selling_price - sl.average_cost) * sl.current_level
              ELSE NULL
            END
          FROM sites s
          JOIN library_stock_levels sl ON sl.site_id = s.id AND sl.library_type = ''packaging''
          JOIN packaging_library p ON p.id = sl.item_id AND p.is_saleable = true
          WHERE sl.current_level > 0';
      END IF;
      
      IF has_foh THEN
        IF has_ingredients OR has_packaging THEN
          v_sql := v_sql || ' UNION ALL';
        END IF;
        v_sql := v_sql || '
          SELECT 
            s.id,
            s.name,
            ''foh'',
            f.id,
            f.item_name,
            sl.current_level,
            sl.average_cost,
            f.selling_price,
            CASE 
              WHEN f.selling_price > 0 AND sl.average_cost > 0
              THEN ((f.selling_price - sl.average_cost) / f.selling_price * 100)
              ELSE NULL
            END,
            CASE 
              WHEN f.selling_price > 0 AND sl.average_cost > 0
              THEN (f.selling_price - sl.average_cost) * sl.current_level
              ELSE NULL
            END
          FROM sites s
          JOIN library_stock_levels sl ON sl.site_id = s.id AND sl.library_type = ''foh''
          JOIN serving_equipment_library f ON f.id = sl.item_id AND f.is_saleable = true
          WHERE sl.current_level > 0';
      END IF;
      
      EXECUTE v_sql;
    END IF;

    -- ============================================================================
    -- PART 7: ENABLE RLS ON NEW TABLES
    -- ============================================================================

    -- RLS for library_stock_levels
    ALTER TABLE library_stock_levels ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view library stock levels from their company sites" ON library_stock_levels;
    CREATE POLICY "Users can view library stock levels from their company sites" ON library_stock_levels
      FOR SELECT
      USING (
        site_id IN (
          SELECT s.id FROM sites s
          JOIN profiles p ON p.company_id = s.company_id
          WHERE p.id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can manage library stock levels from their company sites" ON library_stock_levels;
    CREATE POLICY "Users can manage library stock levels from their company sites" ON library_stock_levels
      FOR ALL
      USING (
        site_id IN (
          SELECT s.id FROM sites s
          JOIN profiles p ON p.company_id = s.company_id
          WHERE p.id = auth.uid()
        )
      );

    -- RLS for library_stock_transactions
    ALTER TABLE library_stock_transactions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view library stock transactions from their company sites" ON library_stock_transactions;
    CREATE POLICY "Users can view library stock transactions from their company sites" ON library_stock_transactions
      FOR SELECT
      USING (
        site_id IN (
          SELECT s.id FROM sites s
          JOIN profiles p ON p.company_id = s.company_id
          WHERE p.id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can insert library stock transactions for their company sites" ON library_stock_transactions;
    CREATE POLICY "Users can insert library stock transactions for their company sites" ON library_stock_transactions
      FOR INSERT
      WITH CHECK (
        site_id IN (
          SELECT s.id FROM sites s
          JOIN profiles p ON p.company_id = s.company_id
          WHERE p.id = auth.uid()
        )
      );

    -- RLS for library_stock_transfers
    ALTER TABLE library_stock_transfers ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view library stock transfers from their company" ON library_stock_transfers;
    CREATE POLICY "Users can view library stock transfers from their company" ON library_stock_transfers
      FOR SELECT
      USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can manage library stock transfers for their company" ON library_stock_transfers;
    CREATE POLICY "Users can manage library stock transfers for their company" ON library_stock_transfers
      FOR ALL
      USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
      );

    -- RLS for library_stock_transfer_items (inherits from parent)
    ALTER TABLE library_stock_transfer_items ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access library stock transfer items via parent" ON library_stock_transfer_items;
    CREATE POLICY "Users can access library stock transfer items via parent" ON library_stock_transfer_items
      FOR ALL
      USING (
        transfer_id IN (
          SELECT id FROM library_stock_transfers
          WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
      );

    RAISE NOTICE '✅ Multi-site library-based stock management system created successfully';

  ELSE
    RAISE NOTICE '⚠️ companies or sites tables do not exist yet - skipping library stock management creation';
  END IF;
END $$;

