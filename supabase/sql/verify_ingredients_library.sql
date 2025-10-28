-- Verify ingredients_library table exists and check its structure
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'ingredients_library'
) AS table_exists;

-- 2. List all columns in the table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ingredients_library'
ORDER BY ordinal_position;

-- 3. Check row count
SELECT COUNT(*) as total_rows FROM ingredients_library;

-- 4. Show sample data (first 5 rows)
SELECT * FROM ingredients_library LIMIT 5;

-- 5. Check if specific columns exist
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'id') AS has_id,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'ingredient_name') AS has_ingredient_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'unit') AS has_unit,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'unit_cost') AS has_unit_cost,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'allergens') AS has_allergens,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'default_colour_code') AS has_default_colour_code,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'category') AS has_category,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients_library' AND column_name = 'supplier') AS has_supplier;

