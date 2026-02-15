-- ============================================================================
-- Migration: Add Customer Management Fields
-- Description: Add fields for customer management, portal access, and status tracking
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if order_book_customers table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_customers'
  ) THEN

    -- Add preferred_delivery_time
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'preferred_delivery_time'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN preferred_delivery_time TIME;
    END IF;

    -- Add delivery_notes
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'delivery_notes'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN delivery_notes TEXT;
    END IF;

    -- Add portal_access_enabled
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'portal_access_enabled'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN portal_access_enabled BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add portal_invite_sent_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'portal_invite_sent_at'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN portal_invite_sent_at TIMESTAMPTZ;
    END IF;

    -- Add minimum_order_value
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'minimum_order_value'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN minimum_order_value DECIMAL(10, 2);
    END IF;

    -- Add internal_notes
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'internal_notes'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN internal_notes TEXT;
    END IF;

    -- Add auth_user_id (link to customer's auth account - 1:1 relationship)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'auth_user_id'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN auth_user_id UUID;
      
      -- Add foreign key if auth.users table exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
      ) THEN
        ALTER TABLE public.order_book_customers
        ADD CONSTRAINT order_book_customers_auth_user_id_fkey
        FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
      END IF;
      
      -- Create index for fast lookups
      CREATE INDEX IF NOT EXISTS idx_order_book_customers_auth_user 
      ON public.order_book_customers(auth_user_id);
    END IF;

    -- Add paused_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'paused_at'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN paused_at TIMESTAMPTZ;
    END IF;

    -- Add paused_reason
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'paused_reason'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN paused_reason TEXT;
    END IF;

    -- Add archived_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_book_customers' 
      AND column_name = 'archived_at'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;

    -- Update status enum constraint
    -- Drop existing constraint if it exists
    ALTER TABLE public.order_book_customers
    DROP CONSTRAINT IF EXISTS order_book_customers_status_check;

    -- Add new constraint with updated status values
    -- Note: 'paused' is cosmetic only - no behavioral restrictions
    ALTER TABLE public.order_book_customers
    ADD CONSTRAINT order_book_customers_status_check 
    CHECK (status IN ('pending', 'active', 'paused', 'archived'));

    RAISE NOTICE '✅ Customer management fields added successfully';

  ELSE
    RAISE NOTICE '⚠️ order_book_customers table does not exist - skipping migration';
  END IF;
END $$;

