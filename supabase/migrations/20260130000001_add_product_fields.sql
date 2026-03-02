-- Migration: Add product fields for portal display
-- description: Marketing description shown on portal
-- is_new: Shows "New!" badge
-- is_paused: Temporarily hidden from portal
-- archived_at: When set, product is permanently hidden

-- Add new columns to planly_products
ALTER TABLE planly_products
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for efficient filtering of active products
CREATE INDEX IF NOT EXISTS idx_planly_products_archived_at
ON planly_products (archived_at)
WHERE archived_at IS NULL;

-- Create index for efficient filtering of paused products
CREATE INDEX IF NOT EXISTS idx_planly_products_is_paused
ON planly_products (is_paused)
WHERE is_paused = FALSE;

-- Comment on columns for documentation
COMMENT ON COLUMN planly_products.description IS 'Marketing description shown on the customer portal';
COMMENT ON COLUMN planly_products.is_new IS 'Shows "New!" badge on portal when true';
COMMENT ON COLUMN planly_products.is_paused IS 'Temporarily hidden from portal ordering when true';
COMMENT ON COLUMN planly_products.archived_at IS 'When set, product is permanently hidden from portal';
