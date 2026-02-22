-- ============================================================================
-- Migration: Customer Portal - Communications Hub
-- Description: Message threads and messaging system
-- ============================================================================

-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_customers'
  ) THEN
    RAISE NOTICE 'companies or order_book_customers table does not exist - skipping customer_portal_communications migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Required tables found - proceeding with customer_portal_communications migration';
END $$;

-- Only proceed if required tables exist (checked above)
DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_customers'
  ) THEN
    RETURN;
  END IF;

  -- ============================================================================
  -- TABLE: order_book_message_threads
  -- ============================================================================
  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS public.order_book_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES order_book_customers(id) ON DELETE CASCADE,
  
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  
  -- Related entities (optional)
  related_order_id UUID REFERENCES order_book_orders(id),
  related_product_id UUID REFERENCES order_book_products(id),
  
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_by UUID REFERENCES profiles(id),
  
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES profiles(id)
    );
  $sql_table1$;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_message_threads_customer ON order_book_message_threads(customer_id);
  CREATE INDEX IF NOT EXISTS idx_message_threads_company ON order_book_message_threads(company_id);
  CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON order_book_message_threads(last_message_at DESC);
  CREATE INDEX IF NOT EXISTS idx_message_threads_status ON order_book_message_threads(status);

  -- ============================================================================
  -- TABLE: order_book_messages
  -- ============================================================================
  EXECUTE $sql_table2$
    CREATE TABLE IF NOT EXISTS public.order_book_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES order_book_message_threads(id) ON DELETE CASCADE,
  
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'supplier', 'system')),
  sender_id UUID REFERENCES profiles(id), -- NULL for system messages
  
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of file URLs
  
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  $sql_table2$;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_messages_thread ON order_book_messages(thread_id);
  CREATE INDEX IF NOT EXISTS idx_messages_created ON order_book_messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_read ON order_book_messages(is_read) WHERE is_read = false;

  -- ============================================================================
  -- FUNCTION: update_message_thread()
  -- ============================================================================
  -- Updates thread metadata when new message is added
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION update_message_thread()
    RETURNS TRIGGER AS $func$
    BEGIN
      UPDATE order_book_message_threads
      SET 
        last_message_at = NEW.created_at,
        last_message_by = NEW.sender_id
      WHERE id = NEW.thread_id;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- Trigger
  DROP TRIGGER IF EXISTS trigger_update_message_thread ON order_book_messages;
  CREATE TRIGGER trigger_update_message_thread
    AFTER INSERT ON order_book_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_thread();

  -- ============================================================================
  -- FUNCTION: get_unread_message_count()
  -- ============================================================================
  -- Returns count of unread messages for a customer
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION get_unread_message_count(
      p_customer_id UUID
    ) RETURNS INTEGER AS $func$
    DECLARE
      v_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_count
      FROM order_book_messages m
      JOIN order_book_message_threads t ON t.id = m.thread_id
      WHERE t.customer_id = p_customer_id
        AND m.sender_type != 'customer'
        AND m.is_read = false;
      
      RETURN COALESCE(v_count, 0);
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

END $$;

