-- ============================================================================
-- Migration: 20260130000000_add_planly_products_missing_columns.sql
-- Description: Add missing columns to planly_products table
-- ============================================================================

-- Add description column for portal display
ALTER TABLE planly_products
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add is_new column for "New!" badge display
ALTER TABLE planly_products
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- Add is_paused column for pausing orders
ALTER TABLE planly_products
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Add archived_at column for soft delete/archive functionality
ALTER TABLE planly_products
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add index for archived products queries
CREATE INDEX IF NOT EXISTS idx_planly_products_archived ON planly_products(site_id, archived_at);

COMMENT ON COLUMN planly_products.description IS 'Marketing description shown on the customer portal';
COMMENT ON COLUMN planly_products.is_new IS 'Whether to show the "New!" badge on the portal';
COMMENT ON COLUMN planly_products.is_paused IS 'Whether ordering is temporarily paused for this product';
COMMENT ON COLUMN planly_products.archived_at IS 'Timestamp when product was archived, NULL if active';
