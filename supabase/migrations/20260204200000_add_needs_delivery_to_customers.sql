-- Add needs_delivery column to planly_customers table
-- Customers flagged as needing delivery will appear on the delivery schedule

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planly_customers' AND column_name = 'needs_delivery'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN needs_delivery BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add index for efficient filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_customers_needs_delivery ON planly_customers(site_id, needs_delivery) WHERE needs_delivery = true;

COMMENT ON COLUMN planly_customers.needs_delivery IS 'Whether this customer requires delivery (vs collection-only)';
