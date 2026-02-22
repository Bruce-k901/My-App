-- ============================================================================
-- Migration: 20250222000002_backfill_suppliers_from_ingredients.sql
-- Description: Backfills supplier placeholders from supplier names in ingredients_library
-- Creates placeholder suppliers with is_approved=false for all unique supplier names
-- that don't already exist (case-insensitive matching)
-- ============================================================================

DO $$
DECLARE
  v_ingredient RECORD;
  v_supplier_name TEXT;
  v_normalized_name TEXT;
  v_existing_supplier_id UUID;
  v_supplier_code TEXT;
  v_prefix TEXT;
  v_next_number INTEGER;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ingredients_library'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'suppliers'
  ) THEN
    RAISE NOTICE 'ingredients_library or suppliers tables do not exist - skipping supplier backfill';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting supplier backfill from ingredients_library...';
  
  -- Loop through all ingredients with supplier names, grouped by company and supplier name
  FOR v_ingredient IN
    SELECT DISTINCT
      il.company_id,
      TRIM(il.supplier) as supplier_name
    FROM public.ingredients_library il
    WHERE il.supplier IS NOT NULL
      AND TRIM(il.supplier) != ''
    ORDER BY il.company_id, TRIM(il.supplier)
  LOOP
    -- Normalize supplier name
    v_normalized_name := TRIM(v_ingredient.supplier_name);
    
    -- Skip if empty after trimming
    IF v_normalized_name = '' THEN
      CONTINUE;
    END IF;
    
    -- Check if supplier already exists (case-insensitive)
    SELECT id INTO v_existing_supplier_id
    FROM public.suppliers
    WHERE company_id = v_ingredient.company_id
      AND LOWER(TRIM(name)) = LOWER(v_normalized_name)
    LIMIT 1;
    
    -- Skip if supplier already exists
    IF v_existing_supplier_id IS NOT NULL THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- Generate supplier code (SUP-{first3}-{number})
    -- Extract first 3 letters (uppercase, letters only)
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
    FROM public.suppliers
    WHERE company_id = v_ingredient.company_id
      AND code IS NOT NULL
      AND code ~ ('^SUP-' || v_prefix || '-[0-9]{3}$');
    
    v_next_number := v_next_number + 1;
    v_supplier_code := 'SUP-' || v_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');
    
    -- Create placeholder supplier
    BEGIN
      INSERT INTO public.suppliers (
        company_id,
        name,
        code,
        is_active,
        is_approved
      )
      VALUES (
        v_ingredient.company_id,
        v_normalized_name,
        v_supplier_code,
        true,
        false  -- Placeholder - needs approval
      );
      
      v_created_count := v_created_count + 1;
      
      -- Log every 10 suppliers
      IF v_created_count % 10 = 0 THEN
        RAISE NOTICE 'Created % supplier placeholders...', v_created_count;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Skip on error (e.g., duplicate code due to race condition)
      RAISE WARNING 'Failed to create supplier "%" for company %: %', 
        v_normalized_name, 
        v_ingredient.company_id, 
        SQLERRM;
      v_skipped_count := v_skipped_count + 1;
    END;
    
  END LOOP;
  
  RAISE NOTICE 'Supplier backfill complete!';
  RAISE NOTICE 'Created: % new supplier placeholders', v_created_count;
  RAISE NOTICE 'Skipped: % (already exist or errors)', v_skipped_count;
  
END;
$$;
