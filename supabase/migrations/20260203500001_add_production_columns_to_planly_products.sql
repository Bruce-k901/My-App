-- ============================================================================
-- Migration: 20260203500001_add_production_columns_to_planly_products.sql
-- Description: Adds production planning columns to planly_products table
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'planly_products') THEN

    -- Add processing_group_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planly_products'
      AND column_name = 'processing_group_id'
    ) THEN
      ALTER TABLE planly_products
        ADD COLUMN processing_group_id UUID REFERENCES planly_processing_groups(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_products_processing_group ON planly_products(processing_group_id) WHERE processing_group_id IS NOT NULL;

      RAISE NOTICE 'Added processing_group_id column to planly_products';
    END IF;

    -- Add base_prep_grams_per_unit column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planly_products'
      AND column_name = 'base_prep_grams_per_unit'
    ) THEN
      ALTER TABLE planly_products
        ADD COLUMN base_prep_grams_per_unit DECIMAL(10,2) CHECK (base_prep_grams_per_unit IS NULL OR base_prep_grams_per_unit > 0);

      RAISE NOTICE 'Added base_prep_grams_per_unit column to planly_products';
    END IF;

    -- Add equipment_type_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planly_products'
      AND column_name = 'equipment_type_id'
    ) THEN
      ALTER TABLE planly_products
        ADD COLUMN equipment_type_id UUID REFERENCES planly_equipment_types(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_products_equipment_type ON planly_products(equipment_type_id) WHERE equipment_type_id IS NOT NULL;

      RAISE NOTICE 'Added equipment_type_id column to planly_products';
    END IF;

    -- Add items_per_equipment column (product-specific override)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planly_products'
      AND column_name = 'items_per_equipment'
    ) THEN
      ALTER TABLE planly_products
        ADD COLUMN items_per_equipment INTEGER CHECK (items_per_equipment IS NULL OR items_per_equipment > 0);

      RAISE NOTICE 'Added items_per_equipment column to planly_products';
    END IF;

    -- Add display_order column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planly_products'
      AND column_name = 'display_order'
    ) THEN
      ALTER TABLE planly_products
        ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

      RAISE NOTICE 'Added display_order column to planly_products';
    END IF;

    -- Add comment explaining the production fields
    COMMENT ON COLUMN planly_products.processing_group_id IS
      'Links product to a processing group for production planning. Products without this are excluded from mix sheet calculations.';
    COMMENT ON COLUMN planly_products.base_prep_grams_per_unit IS
      'How many grams of base prep (dough, batter, etc.) this product uses per unit. Used for backwards calculation.';
    COMMENT ON COLUMN planly_products.equipment_type_id IS
      'Type of equipment used for baking/production (trays, racks, etc.).';
    COMMENT ON COLUMN planly_products.items_per_equipment IS
      'Product-specific override for how many items fit on one equipment unit. If NULL, uses equipment type default.';
    COMMENT ON COLUMN planly_products.display_order IS
      'Sort order for display in production plans and tray layouts.';

  ELSE
    RAISE NOTICE 'planly_products table does not exist - skipping migration';
  END IF;
END $$;
