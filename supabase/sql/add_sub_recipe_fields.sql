-- Add sub-recipe support fields to ingredients_library
-- This migration adds fields needed to support sub-recipes from Food SOPs

-- Add new columns for sub-recipe support
ALTER TABLE ingredients_library
ADD COLUMN IF NOT EXISTS linked_sop_id UUID REFERENCES sop_entries(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pack_size TEXT,
ADD COLUMN IF NOT EXISTS default_colour_code TEXT,
ADD COLUMN IF NOT EXISTS food_group TEXT,
ADD COLUMN IF NOT EXISTS density_g_per_cup NUMERIC,
ADD COLUMN IF NOT EXISTS density_g_per_tbsp NUMERIC,
ADD COLUMN IF NOT EXISTS density_g_per_tsp NUMERIC;

-- Create index for linked_sop_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ingredients_library_linked_sop_id ON ingredients_library(linked_sop_id);

-- Add comment to explain the new field
COMMENT ON COLUMN ingredients_library.linked_sop_id IS 'References a Food SOP entry if this ingredient is a sub-recipe';

