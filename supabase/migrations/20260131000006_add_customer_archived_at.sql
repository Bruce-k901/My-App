-- Add archived_at column to track when customer was archived
ALTER TABLE planly_customers
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering archived customers
CREATE INDEX IF NOT EXISTS idx_customers_archived
  ON planly_customers(site_id, is_active)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN planly_customers.archived_at IS
  'Timestamp when customer was archived. NULL = active customer.';
