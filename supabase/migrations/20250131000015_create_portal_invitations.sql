-- ============================================================================
-- Migration: Create Portal Invitations Table
-- Description: Table for managing customer portal invitation tokens
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if order_book_customers table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_customers'
  ) THEN

    -- Create portal_invitations table
    CREATE TABLE IF NOT EXISTS public.portal_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign key constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'portal_invitations_customer_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'portal_invitations'
    ) THEN
      ALTER TABLE public.portal_invitations
      ADD CONSTRAINT portal_invitations_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.order_book_customers(id) ON DELETE CASCADE;
    END IF;

    -- Create indexes
    CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_invitations_token 
    ON public.portal_invitations(token);

    CREATE INDEX IF NOT EXISTS idx_portal_invitations_customer 
    ON public.portal_invitations(customer_id);

    CREATE INDEX IF NOT EXISTS idx_portal_invitations_expires 
    ON public.portal_invitations(expires_at) 
    WHERE used_at IS NULL;

    -- Add comment explaining multiple invitations are allowed
    COMMENT ON TABLE public.portal_invitations IS 
    'Stores portal invitation tokens for customers. Multiple invitations allowed per customer. On resend, new token is generated and old one is expired.';

    RAISE NOTICE '✅ Portal invitations table created successfully';

  ELSE
    RAISE NOTICE '⚠️ order_book_customers table does not exist - skipping migration';
  END IF;
END $$;

