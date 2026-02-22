-- Ensure all required columns exist on planly_customers
-- This migration adds any columns that may be missing

DO $$
BEGIN
  -- Add delivery_instructions if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'planly_customers'
    AND column_name = 'delivery_instructions'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN delivery_instructions TEXT;
  END IF;

  -- Add finance_contact_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'planly_customers'
    AND column_name = 'finance_contact_name'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN finance_contact_name TEXT;
  END IF;

  -- Add finance_contact_email if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'planly_customers'
    AND column_name = 'finance_contact_email'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN finance_contact_email TEXT;
  END IF;

  -- Add finance_contact_phone if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'planly_customers'
    AND column_name = 'finance_contact_phone'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN finance_contact_phone TEXT;
  END IF;

  -- Add default_payment_terms if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'planly_customers'
    AND column_name = 'default_payment_terms'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN default_payment_terms TEXT DEFAULT 'net_30';
  END IF;

  -- Add portal_enabled if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'planly_customers'
    AND column_name = 'portal_enabled'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN portal_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add archived_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'planly_customers'
    AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE planly_customers ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  RAISE NOTICE 'Ensured all required columns exist on planly_customers';
END $$;
