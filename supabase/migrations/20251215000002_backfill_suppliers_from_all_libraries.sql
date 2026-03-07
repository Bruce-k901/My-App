-- ============================================================================
-- Migration: Backfill Suppliers from All Libraries
-- Description: Backfills supplier placeholders from supplier names found in:
--   - ingredients_library
--   - chemicals_library
--   - first_aid_supplies_library
-- Creates placeholder suppliers with is_approved=false for all unique supplier names
-- that don't already exist (case-insensitive matching)
-- Date: 2025-12-15
-- ============================================================================

DO $$
DECLARE
  v_library_item RECORD;
  v_supplier_name TEXT;
  v_normalized_name TEXT;
  v_existing_supplier_id UUID;
  v_supplier_code TEXT;
  v_prefix TEXT;
  v_next_number INTEGER;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_library_name TEXT;
BEGIN
  RAISE NOTICE 'Starting supplier backfill from all libraries...';
  
  -- ============================================================================
  -- Process ingredients_library
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
    RAISE NOTICE 'Processing ingredients_library...';
    
    FOR v_library_item IN
      SELECT DISTINCT
        il.company_id,
        TRIM(il.supplier) as supplier_name
      FROM public.ingredients_library il
      WHERE il.supplier IS NOT NULL
        AND TRIM(il.supplier) != ''
      ORDER BY il.company_id, TRIM(il.supplier)
    LOOP
      v_library_name := 'ingredients_library';
      v_normalized_name := TRIM(v_library_item.supplier_name);
      
      IF v_normalized_name = '' THEN
        CONTINUE;
      END IF;
      
      -- Check if supplier already exists in stockly.suppliers (case-insensitive)
      SELECT id INTO v_existing_supplier_id
      FROM stockly.suppliers
      WHERE company_id = v_library_item.company_id
        AND LOWER(TRIM(name)) = LOWER(v_normalized_name)
      LIMIT 1;
      
      IF v_existing_supplier_id IS NOT NULL THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- Generate supplier code (SUP-{first3}-{number})
      v_prefix := UPPER(REGEXP_REPLACE(v_normalized_name, '[^a-zA-Z]', '', 'g'));
      IF LENGTH(v_prefix) < 3 THEN
        v_prefix := RPAD(v_prefix, 3, 'X');
      ELSIF LENGTH(v_prefix) > 3 THEN
        v_prefix := SUBSTRING(v_prefix, 1, 3);
      END IF;
      
      -- Find highest existing number for this prefix in the same company
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(code FROM 'SUP-[A-Z]{3}-(\d+)') AS INTEGER)), 
        0
      )
      INTO v_next_number
      FROM stockly.suppliers
      WHERE company_id = v_library_item.company_id
        AND code IS NOT NULL
        AND code ~ ('^SUP-' || v_prefix || '-[0-9]{3}$');
      
      v_next_number := v_next_number + 1;
      v_supplier_code := 'SUP-' || v_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');
      
      -- Create placeholder supplier
      BEGIN
        -- Check if is_approved column exists, if not, don't include it
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'stockly' 
          AND table_name = 'suppliers' 
          AND column_name = 'is_approved'
        ) THEN
          INSERT INTO stockly.suppliers (
            company_id,
            name,
            code,
            is_active,
            is_approved
          )
          VALUES (
            v_library_item.company_id,
            v_normalized_name,
            v_supplier_code,
            true,
            false  -- Placeholder - needs approval
          );
        ELSE
          INSERT INTO stockly.suppliers (
            company_id,
            name,
            code,
            is_active
          )
          VALUES (
            v_library_item.company_id,
            v_normalized_name,
            v_supplier_code,
            true
          );
        END IF;
        
        v_created_count := v_created_count + 1;
        
        IF v_created_count % 10 = 0 THEN
          RAISE NOTICE 'Created % supplier placeholders...', v_created_count;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create supplier "%" for company %: %', 
          v_normalized_name, 
          v_library_item.company_id, 
          SQLERRM;
        v_skipped_count := v_skipped_count + 1;
      END;
    END LOOP;
  END IF;
  
  -- ============================================================================
  -- Process chemicals_library
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chemicals_library') THEN
    RAISE NOTICE 'Processing chemicals_library...';
    
    FOR v_library_item IN
      SELECT DISTINCT
        cl.company_id,
        TRIM(cl.supplier) as supplier_name
      FROM public.chemicals_library cl
      WHERE cl.supplier IS NOT NULL
        AND TRIM(cl.supplier) != ''
      ORDER BY cl.company_id, TRIM(cl.supplier)
    LOOP
      v_library_name := 'chemicals_library';
      v_normalized_name := TRIM(v_library_item.supplier_name);
      
      IF v_normalized_name = '' THEN
        CONTINUE;
      END IF;
      
      -- Check if supplier already exists in stockly.suppliers (case-insensitive)
      SELECT id INTO v_existing_supplier_id
      FROM stockly.suppliers
      WHERE company_id = v_library_item.company_id
        AND LOWER(TRIM(name)) = LOWER(v_normalized_name)
      LIMIT 1;
      
      IF v_existing_supplier_id IS NOT NULL THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- Generate supplier code (SUP-{first3}-{number})
      v_prefix := UPPER(REGEXP_REPLACE(v_normalized_name, '[^a-zA-Z]', '', 'g'));
      IF LENGTH(v_prefix) < 3 THEN
        v_prefix := RPAD(v_prefix, 3, 'X');
      ELSIF LENGTH(v_prefix) > 3 THEN
        v_prefix := SUBSTRING(v_prefix, 1, 3);
      END IF;
      
      -- Find highest existing number for this prefix in the same company
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(code FROM 'SUP-[A-Z]{3}-(\d+)') AS INTEGER)), 
        0
      )
      INTO v_next_number
      FROM stockly.suppliers
      WHERE company_id = v_library_item.company_id
        AND code IS NOT NULL
        AND code ~ ('^SUP-' || v_prefix || '-[0-9]{3}$');
      
      v_next_number := v_next_number + 1;
      v_supplier_code := 'SUP-' || v_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');
      
      -- Create placeholder supplier
      BEGIN
        -- Check if is_approved column exists, if not, don't include it
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'stockly' 
          AND table_name = 'suppliers' 
          AND column_name = 'is_approved'
        ) THEN
          INSERT INTO stockly.suppliers (
            company_id,
            name,
            code,
            is_active,
            is_approved
          )
          VALUES (
            v_library_item.company_id,
            v_normalized_name,
            v_supplier_code,
            true,
            false  -- Placeholder - needs approval
          );
        ELSE
          INSERT INTO stockly.suppliers (
            company_id,
            name,
            code,
            is_active
          )
          VALUES (
            v_library_item.company_id,
            v_normalized_name,
            v_supplier_code,
            true
          );
        END IF;
        
        v_created_count := v_created_count + 1;
        
        IF v_created_count % 10 = 0 THEN
          RAISE NOTICE 'Created % supplier placeholders...', v_created_count;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create supplier "%" for company %: %', 
          v_normalized_name, 
          v_library_item.company_id, 
          SQLERRM;
        v_skipped_count := v_skipped_count + 1;
      END;
    END LOOP;
  END IF;
  
  -- ============================================================================
  -- Process first_aid_supplies_library
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'first_aid_supplies_library') THEN
    RAISE NOTICE 'Processing first_aid_supplies_library...';
    
    FOR v_library_item IN
      SELECT DISTINCT
        fasl.company_id,
        TRIM(fasl.supplier) as supplier_name
      FROM public.first_aid_supplies_library fasl
      WHERE fasl.supplier IS NOT NULL
        AND TRIM(fasl.supplier) != ''
      ORDER BY fasl.company_id, TRIM(fasl.supplier)
    LOOP
      v_library_name := 'first_aid_supplies_library';
      v_normalized_name := TRIM(v_library_item.supplier_name);
      
      IF v_normalized_name = '' THEN
        CONTINUE;
      END IF;
      
      -- Check if supplier already exists in stockly.suppliers (case-insensitive)
      SELECT id INTO v_existing_supplier_id
      FROM stockly.suppliers
      WHERE company_id = v_library_item.company_id
        AND LOWER(TRIM(name)) = LOWER(v_normalized_name)
      LIMIT 1;
      
      IF v_existing_supplier_id IS NOT NULL THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- Generate supplier code (SUP-{first3}-{number})
      v_prefix := UPPER(REGEXP_REPLACE(v_normalized_name, '[^a-zA-Z]', '', 'g'));
      IF LENGTH(v_prefix) < 3 THEN
        v_prefix := RPAD(v_prefix, 3, 'X');
      ELSIF LENGTH(v_prefix) > 3 THEN
        v_prefix := SUBSTRING(v_prefix, 1, 3);
      END IF;
      
      -- Find highest existing number for this prefix in the same company
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(code FROM 'SUP-[A-Z]{3}-(\d+)') AS INTEGER)), 
        0
      )
      INTO v_next_number
      FROM stockly.suppliers
      WHERE company_id = v_library_item.company_id
        AND code IS NOT NULL
        AND code ~ ('^SUP-' || v_prefix || '-[0-9]{3}$');
      
      v_next_number := v_next_number + 1;
      v_supplier_code := 'SUP-' || v_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');
      
      -- Create placeholder supplier
      BEGIN
        -- Check if is_approved column exists, if not, don't include it
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'stockly' 
          AND table_name = 'suppliers' 
          AND column_name = 'is_approved'
        ) THEN
          INSERT INTO stockly.suppliers (
            company_id,
            name,
            code,
            is_active,
            is_approved
          )
          VALUES (
            v_library_item.company_id,
            v_normalized_name,
            v_supplier_code,
            true,
            false  -- Placeholder - needs approval
          );
        ELSE
          INSERT INTO stockly.suppliers (
            company_id,
            name,
            code,
            is_active
          )
          VALUES (
            v_library_item.company_id,
            v_normalized_name,
            v_supplier_code,
            true
          );
        END IF;
        
        v_created_count := v_created_count + 1;
        
        IF v_created_count % 10 = 0 THEN
          RAISE NOTICE 'Created % supplier placeholders...', v_created_count;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create supplier "%" for company %: %', 
          v_normalized_name, 
          v_library_item.company_id, 
          SQLERRM;
        v_skipped_count := v_skipped_count + 1;
      END;
    END LOOP;
  END IF;
  
  RAISE NOTICE 'Supplier backfill complete!';
  RAISE NOTICE 'Created: % new supplier placeholders', v_created_count;
  RAISE NOTICE 'Skipped: % (already exist or errors)', v_skipped_count;
  
END;
$$;
