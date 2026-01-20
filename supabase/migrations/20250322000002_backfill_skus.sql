-- Migration: 20250322000002_backfill_skus.sql
-- Description: Backfill SKU numbers for existing library items that don't have SKUs
-- Format: {companyPrefix}-{itemPrefix}-{3digitNumber}

DO $$
DECLARE
  rec RECORD;
  company_prefix TEXT;
  item_prefix TEXT;
  base_sku TEXT;
  existing_skus TEXT[];
  next_num INT;
  new_sku TEXT;
  sku_counter INT := 0;
BEGIN
  -- Backfill SKUs for ingredients_library
  FOR rec IN 
    SELECT 
      il.id,
      il.ingredient_name,
      il.sku,
      c.name as company_name
    FROM public.ingredients_library il
    JOIN public.companies c ON il.company_id = c.id
    WHERE il.sku IS NULL OR il.sku = ''
    ORDER BY il.company_id, il.ingredient_name
  LOOP
    -- Extract company prefix (first 3 alphanumeric chars, uppercase)
    company_prefix := UPPER(REGEXP_REPLACE(rec.company_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(company_prefix) = 0 THEN
      company_prefix := 'XXX';
    ELSIF LENGTH(company_prefix) > 3 THEN
      company_prefix := SUBSTRING(company_prefix, 1, 3);
    END IF;
    
    -- Extract item prefix (first 3 alphanumeric chars, uppercase)
    item_prefix := UPPER(REGEXP_REPLACE(rec.ingredient_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(item_prefix) = 0 THEN
      item_prefix := 'XXX';
    ELSIF LENGTH(item_prefix) > 3 THEN
      item_prefix := SUBSTRING(item_prefix, 1, 3);
    END IF;
    
    base_sku := company_prefix || '-' || item_prefix || '-';
    
    -- Get all existing SKUs with this prefix for the same company
    SELECT ARRAY_AGG(sku)
    INTO existing_skus
    FROM public.ingredients_library
    WHERE company_id = (SELECT company_id FROM public.ingredients_library WHERE id = rec.id)
      AND sku IS NOT NULL
      AND sku LIKE base_sku || '%';
    
    -- Find next available number
    next_num := 1;
    IF existing_skus IS NOT NULL THEN
      FOR i IN 1..array_length(existing_skus, 1) LOOP
        DECLARE
          num_str TEXT;
          num_val INT;
        BEGIN
          num_str := SUBSTRING(existing_skus[i] FROM base_sku || '([0-9]{3})$');
          IF num_str IS NOT NULL THEN
            num_val := num_str::INT;
            IF num_val = next_num THEN
              next_num := next_num + 1;
            ELSIF num_val > next_num THEN
              EXIT;
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;
    
    -- Generate new SKU
    new_sku := base_sku || LPAD(next_num::TEXT, 3, '0');
    
    -- Update the record
    UPDATE public.ingredients_library
    SET sku = new_sku
    WHERE id = rec.id;
    
    sku_counter := sku_counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % SKUs for ingredients_library', sku_counter;
  sku_counter := 0;
  
  -- Backfill SKUs for ppe_library
  FOR rec IN 
    SELECT 
      pl.id,
      pl.item_name,
      pl.sku,
      c.name as company_name
    FROM public.ppe_library pl
    JOIN public.companies c ON pl.company_id = c.id
    WHERE pl.sku IS NULL OR pl.sku = ''
    ORDER BY pl.company_id, pl.item_name
  LOOP
    company_prefix := UPPER(REGEXP_REPLACE(rec.company_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(company_prefix) = 0 THEN
      company_prefix := 'XXX';
    ELSIF LENGTH(company_prefix) > 3 THEN
      company_prefix := SUBSTRING(company_prefix, 1, 3);
    END IF;
    
    item_prefix := UPPER(REGEXP_REPLACE(rec.item_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(item_prefix) = 0 THEN
      item_prefix := 'XXX';
    ELSIF LENGTH(item_prefix) > 3 THEN
      item_prefix := SUBSTRING(item_prefix, 1, 3);
    END IF;
    
    base_sku := company_prefix || '-' || item_prefix || '-';
    
    SELECT ARRAY_AGG(sku)
    INTO existing_skus
    FROM public.ppe_library
    WHERE company_id = (SELECT company_id FROM public.ppe_library WHERE id = rec.id)
      AND sku IS NOT NULL
      AND sku LIKE base_sku || '%';
    
    next_num := 1;
    IF existing_skus IS NOT NULL THEN
      FOR i IN 1..array_length(existing_skus, 1) LOOP
        DECLARE
          num_str TEXT;
          num_val INT;
        BEGIN
          num_str := SUBSTRING(existing_skus[i] FROM base_sku || '([0-9]{3})$');
          IF num_str IS NOT NULL THEN
            num_val := num_str::INT;
            IF num_val = next_num THEN
              next_num := next_num + 1;
            ELSIF num_val > next_num THEN
              EXIT;
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;
    
    new_sku := base_sku || LPAD(next_num::TEXT, 3, '0');
    
    UPDATE public.ppe_library
    SET sku = new_sku
    WHERE id = rec.id;
    
    sku_counter := sku_counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % SKUs for ppe_library', sku_counter;
  sku_counter := 0;
  
  -- Backfill SKUs for chemicals_library
  FOR rec IN 
    SELECT 
      cl.id,
      cl.product_name,
      cl.sku,
      c.name as company_name
    FROM public.chemicals_library cl
    JOIN public.companies c ON cl.company_id = c.id
    WHERE cl.sku IS NULL OR cl.sku = ''
    ORDER BY cl.company_id, cl.product_name
  LOOP
    company_prefix := UPPER(REGEXP_REPLACE(rec.company_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(company_prefix) = 0 THEN
      company_prefix := 'XXX';
    ELSIF LENGTH(company_prefix) > 3 THEN
      company_prefix := SUBSTRING(company_prefix, 1, 3);
    END IF;
    
    item_prefix := UPPER(REGEXP_REPLACE(rec.product_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(item_prefix) = 0 THEN
      item_prefix := 'XXX';
    ELSIF LENGTH(item_prefix) > 3 THEN
      item_prefix := SUBSTRING(item_prefix, 1, 3);
    END IF;
    
    base_sku := company_prefix || '-' || item_prefix || '-';
    
    SELECT ARRAY_AGG(sku)
    INTO existing_skus
    FROM public.chemicals_library
    WHERE company_id = (SELECT company_id FROM public.chemicals_library WHERE id = rec.id)
      AND sku IS NOT NULL
      AND sku LIKE base_sku || '%';
    
    next_num := 1;
    IF existing_skus IS NOT NULL THEN
      FOR i IN 1..array_length(existing_skus, 1) LOOP
        DECLARE
          num_str TEXT;
          num_val INT;
        BEGIN
          num_str := SUBSTRING(existing_skus[i] FROM base_sku || '([0-9]{3})$');
          IF num_str IS NOT NULL THEN
            num_val := num_str::INT;
            IF num_val = next_num THEN
              next_num := next_num + 1;
            ELSIF num_val > next_num THEN
              EXIT;
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;
    
    new_sku := base_sku || LPAD(next_num::TEXT, 3, '0');
    
    UPDATE public.chemicals_library
    SET sku = new_sku
    WHERE id = rec.id;
    
    sku_counter := sku_counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % SKUs for chemicals_library', sku_counter;
  sku_counter := 0;
  
  -- Backfill SKUs for disposables_library
  FOR rec IN 
    SELECT 
      dl.id,
      dl.item_name,
      dl.sku,
      c.name as company_name
    FROM public.disposables_library dl
    JOIN public.companies c ON dl.company_id = c.id
    WHERE dl.sku IS NULL OR dl.sku = ''
    ORDER BY dl.company_id, dl.item_name
  LOOP
    company_prefix := UPPER(REGEXP_REPLACE(rec.company_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(company_prefix) = 0 THEN
      company_prefix := 'XXX';
    ELSIF LENGTH(company_prefix) > 3 THEN
      company_prefix := SUBSTRING(company_prefix, 1, 3);
    END IF;
    
    item_prefix := UPPER(REGEXP_REPLACE(rec.item_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(item_prefix) = 0 THEN
      item_prefix := 'XXX';
    ELSIF LENGTH(item_prefix) > 3 THEN
      item_prefix := SUBSTRING(item_prefix, 1, 3);
    END IF;
    
    base_sku := company_prefix || '-' || item_prefix || '-';
    
    SELECT ARRAY_AGG(sku)
    INTO existing_skus
    FROM public.disposables_library
    WHERE company_id = (SELECT company_id FROM public.disposables_library WHERE id = rec.id)
      AND sku IS NOT NULL
      AND sku LIKE base_sku || '%';
    
    next_num := 1;
    IF existing_skus IS NOT NULL THEN
      FOR i IN 1..array_length(existing_skus, 1) LOOP
        DECLARE
          num_str TEXT;
          num_val INT;
        BEGIN
          num_str := SUBSTRING(existing_skus[i] FROM base_sku || '([0-9]{3})$');
          IF num_str IS NOT NULL THEN
            num_val := num_str::INT;
            IF num_val = next_num THEN
              next_num := next_num + 1;
            ELSIF num_val > next_num THEN
              EXIT;
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;
    
    new_sku := base_sku || LPAD(next_num::TEXT, 3, '0');
    
    UPDATE public.disposables_library
    SET sku = new_sku
    WHERE id = rec.id;
    
    sku_counter := sku_counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % SKUs for disposables_library', sku_counter;
  sku_counter := 0;
  
  -- Backfill SKUs for first_aid_supplies_library
  FOR rec IN 
    SELECT 
      fal.id,
      fal.item_name,
      fal.sku,
      c.name as company_name
    FROM public.first_aid_supplies_library fal
    JOIN public.companies c ON fal.company_id = c.id
    WHERE fal.sku IS NULL OR fal.sku = ''
    ORDER BY fal.company_id, fal.item_name
  LOOP
    company_prefix := UPPER(REGEXP_REPLACE(rec.company_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(company_prefix) = 0 THEN
      company_prefix := 'XXX';
    ELSIF LENGTH(company_prefix) > 3 THEN
      company_prefix := SUBSTRING(company_prefix, 1, 3);
    END IF;
    
    item_prefix := UPPER(REGEXP_REPLACE(rec.item_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(item_prefix) = 0 THEN
      item_prefix := 'XXX';
    ELSIF LENGTH(item_prefix) > 3 THEN
      item_prefix := SUBSTRING(item_prefix, 1, 3);
    END IF;
    
    base_sku := company_prefix || '-' || item_prefix || '-';
    
    SELECT ARRAY_AGG(sku)
    INTO existing_skus
    FROM public.first_aid_supplies_library
    WHERE company_id = (SELECT company_id FROM public.first_aid_supplies_library WHERE id = rec.id)
      AND sku IS NOT NULL
      AND sku LIKE base_sku || '%';
    
    next_num := 1;
    IF existing_skus IS NOT NULL THEN
      FOR i IN 1..array_length(existing_skus, 1) LOOP
        DECLARE
          num_str TEXT;
          num_val INT;
        BEGIN
          num_str := SUBSTRING(existing_skus[i] FROM base_sku || '([0-9]{3})$');
          IF num_str IS NOT NULL THEN
            num_val := num_str::INT;
            IF num_val = next_num THEN
              next_num := next_num + 1;
            ELSIF num_val > next_num THEN
              EXIT;
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;
    
    new_sku := base_sku || LPAD(next_num::TEXT, 3, '0');
    
    UPDATE public.first_aid_supplies_library
    SET sku = new_sku
    WHERE id = rec.id;
    
    sku_counter := sku_counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % SKUs for first_aid_supplies_library', sku_counter;
  sku_counter := 0;
  
  -- Backfill SKUs for packaging_library (only if sku column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'packaging_library' 
    AND column_name = 'sku'
  ) THEN
    FOR rec IN 
      SELECT 
        pkl.id,
        pkl.item_name,
        pkl.sku,
        c.name as company_name
      FROM public.packaging_library pkl
      JOIN public.companies c ON pkl.company_id = c.id
      WHERE pkl.sku IS NULL OR pkl.sku = ''
      ORDER BY pkl.company_id, pkl.item_name
    LOOP
    company_prefix := UPPER(REGEXP_REPLACE(rec.company_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(company_prefix) = 0 THEN
      company_prefix := 'XXX';
    ELSIF LENGTH(company_prefix) > 3 THEN
      company_prefix := SUBSTRING(company_prefix, 1, 3);
    END IF;
    
    item_prefix := UPPER(REGEXP_REPLACE(rec.item_name, '[^a-zA-Z0-9]', '', 'g'));
    IF LENGTH(item_prefix) = 0 THEN
      item_prefix := 'XXX';
    ELSIF LENGTH(item_prefix) > 3 THEN
      item_prefix := SUBSTRING(item_prefix, 1, 3);
    END IF;
    
    base_sku := company_prefix || '-' || item_prefix || '-';
    
    SELECT ARRAY_AGG(sku)
    INTO existing_skus
    FROM public.packaging_library
    WHERE company_id = (SELECT company_id FROM public.packaging_library WHERE id = rec.id)
      AND sku IS NOT NULL
      AND sku LIKE base_sku || '%';
    
    next_num := 1;
    IF existing_skus IS NOT NULL THEN
      FOR i IN 1..array_length(existing_skus, 1) LOOP
        DECLARE
          num_str TEXT;
          num_val INT;
        BEGIN
          num_str := SUBSTRING(existing_skus[i] FROM base_sku || '([0-9]{3})$');
          IF num_str IS NOT NULL THEN
            num_val := num_str::INT;
            IF num_val = next_num THEN
              next_num := next_num + 1;
            ELSIF num_val > next_num THEN
              EXIT;
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;
    
    new_sku := base_sku || LPAD(next_num::TEXT, 3, '0');
    
    UPDATE public.packaging_library
    SET sku = new_sku
    WHERE id = rec.id;
    
      sku_counter := sku_counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Backfilled % SKUs for packaging_library', sku_counter;
  ELSE
    RAISE NOTICE 'packaging_library does not have a sku column - skipping';
  END IF;
  
  RAISE NOTICE 'SKU backfill completed successfully';
END $$;

