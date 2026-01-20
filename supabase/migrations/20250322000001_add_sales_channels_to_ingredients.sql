-- Migration: 20250322000001_add_sales_channels_to_ingredients.sql
-- Description: Add sales channel columns to ingredients_library (replacing is_saleable)
-- Date: 2025-03-22

BEGIN;

-- Add sales channel columns to ingredients_library
DO $$
BEGIN
  -- Add retail sales channel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'is_retail_saleable'
  ) THEN
    ALTER TABLE public.ingredients_library 
      ADD COLUMN is_retail_saleable BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add wholesale sales channel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'is_wholesale_saleable'
  ) THEN
    ALTER TABLE public.ingredients_library 
      ADD COLUMN is_wholesale_saleable BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add online sales channel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'is_online_saleable'
  ) THEN
    ALTER TABLE public.ingredients_library 
      ADD COLUMN is_online_saleable BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add retail price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'retail_price'
  ) THEN
    ALTER TABLE public.ingredients_library 
      ADD COLUMN retail_price NUMERIC(10, 2);
  END IF;

  -- Add wholesale price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'wholesale_price'
  ) THEN
    ALTER TABLE public.ingredients_library 
      ADD COLUMN wholesale_price NUMERIC(10, 2);
  END IF;

  -- Add online price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'online_price'
  ) THEN
    ALTER TABLE public.ingredients_library 
      ADD COLUMN online_price NUMERIC(10, 2);
  END IF;

  -- Migrate existing is_saleable data to is_retail_saleable (if is_saleable column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'is_saleable'
  ) THEN
    UPDATE public.ingredients_library 
    SET is_retail_saleable = is_saleable 
    WHERE is_saleable = TRUE AND (is_retail_saleable IS NULL OR is_retail_saleable = FALSE);
  END IF;

  -- Migrate existing sale_price to retail_price (if sale_price column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library' 
    AND column_name = 'sale_price'
  ) THEN
    UPDATE public.ingredients_library 
    SET retail_price = sale_price 
    WHERE sale_price IS NOT NULL AND retail_price IS NULL;
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

