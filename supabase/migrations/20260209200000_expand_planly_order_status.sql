-- Expand planly_orders status to support customer portal workflow
-- Adds 'draft' (customer-placed, not yet reviewed) and 'cancelled' to the order_status enum
DO $$
BEGIN
  -- Add 'draft' before 'confirmed' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'draft' AND enumtypid = 'order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'draft' BEFORE 'confirmed';
  END IF;
END $$;

DO $$
BEGIN
  -- Add 'cancelled' after 'locked' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = 'order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'cancelled' AFTER 'locked';
  END IF;
END $$;
