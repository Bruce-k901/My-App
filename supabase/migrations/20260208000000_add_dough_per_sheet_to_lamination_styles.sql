-- Migration: Add dough_per_sheet_g to planly_lamination_styles
-- Purpose: Separate dough mix calculation from lamination sheet count
--
-- Currently the system assumes 1 sheet = 1 recipe batch when scaling dough ingredients.
-- This is incorrect because recipe yield (e.g., 1022g) can differ from sheet weight (e.g., 2000g).
-- This new column stores how many grams of base dough go into one lamination sheet,
-- allowing the system to calculate: total_dough = sheets * dough_per_sheet_g,
-- then: recipe_batches = total_dough / recipe_yield.

ALTER TABLE planly_lamination_styles
  ADD COLUMN IF NOT EXISTS dough_per_sheet_g DECIMAL(10,1);

COMMENT ON COLUMN planly_lamination_styles.dough_per_sheet_g IS 'Weight of base dough (in grams) that goes into one lamination sheet. Used to calculate total dough mix requirement independently of recipe yield.';
