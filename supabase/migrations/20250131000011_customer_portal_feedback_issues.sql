-- ============================================================================
-- Migration: Customer Portal - Feedback & Issues
-- Description: Issue reporting, product ratings, and credit requests
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
    RAISE NOTICE 'companies or order_book_customers table does not exist - skipping customer_portal_feedback_issues migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Required tables found - proceeding with customer_portal_feedback_issues migration';
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
  -- TABLE: order_book_issues
  -- ============================================================================
  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS public.order_book_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES order_book_customers(id) ON DELETE CASCADE,
  
  issue_number TEXT UNIQUE NOT NULL, -- ISS-YYYYMMDD-001
  
  -- Issue details
  issue_type TEXT NOT NULL CHECK (issue_type IN ('quality', 'delivery', 'pricing', 'quantity', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Related entities
  order_id UUID REFERENCES order_book_orders(id),
  affected_items JSONB DEFAULT '[]'::jsonb, -- [{product_id, quantity, details}]
  
  -- Evidence
  photos JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  
  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed', 'rejected')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  requested_resolution TEXT CHECK (requested_resolution IN ('credit', 'replacement', 'discuss')),
  actual_resolution TEXT,
  resolution_notes TEXT,
  
  -- Credits
  credit_amount DECIMAL(10,2),
  credit_applied_at TIMESTAMPTZ,
  
  -- Workflow
  assigned_to UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES profiles(id) NOT NULL
    );
  $sql_table1$;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_issues_customer ON order_book_issues(customer_id);
  CREATE INDEX IF NOT EXISTS idx_issues_status ON order_book_issues(status);
  CREATE INDEX IF NOT EXISTS idx_issues_order ON order_book_issues(order_id);
  CREATE INDEX IF NOT EXISTS idx_issues_created ON order_book_issues(created_at DESC);

  -- ============================================================================
  -- TABLE: order_book_issue_comments
  -- ============================================================================
  EXECUTE $sql_table2$
    CREATE TABLE IF NOT EXISTS public.order_book_issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES order_book_issues(id) ON DELETE CASCADE,
  
  commenter_type TEXT NOT NULL CHECK (commenter_type IN ('customer', 'supplier', 'system')),
  commenter_id UUID REFERENCES profiles(id),
  
  comment TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal BOOLEAN DEFAULT false, -- Supplier-only notes
  
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  $sql_table2$;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON order_book_issue_comments(issue_id);
  CREATE INDEX IF NOT EXISTS idx_issue_comments_created ON order_book_issue_comments(created_at DESC);

  -- ============================================================================
  -- TABLE: order_book_product_ratings
  -- ============================================================================
  EXECUTE $sql_table3$
    CREATE TABLE IF NOT EXISTS public.order_book_product_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES order_book_customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES order_book_products(id) ON DELETE CASCADE,
  
  -- Overall rating
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  
  -- Category ratings (optional)
  taste_rating INTEGER CHECK (taste_rating BETWEEN 1 AND 5),
  freshness_rating INTEGER CHECK (freshness_rating BETWEEN 1 AND 5),
  consistency_rating INTEGER CHECK (consistency_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  
  -- Context
  related_order_id UUID REFERENCES order_book_orders(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  
      UNIQUE(customer_id, product_id) -- One rating per customer per product (can update)
    );
  $sql_table3$;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON order_book_product_ratings(product_id);
  CREATE INDEX IF NOT EXISTS idx_product_ratings_customer ON order_book_product_ratings(customer_id);

  -- ============================================================================
  -- TABLE: order_book_credit_requests
  -- ============================================================================
  EXECUTE $sql_table4$
    CREATE TABLE IF NOT EXISTS public.order_book_credit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES order_book_customers(id) ON DELETE CASCADE,
  
  request_number TEXT UNIQUE NOT NULL, -- CRD-YYYYMMDD-001
  
  -- Request details
  order_id UUID REFERENCES order_book_orders(id),
  issue_id UUID REFERENCES order_book_issues(id), -- Optional link
  
  affected_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{product_id, quantity, reason}]
  reason TEXT NOT NULL,
  
  requested_amount DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  
  approved_amount DECIMAL(10,2),
  approval_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  
  applied_at TIMESTAMPTZ,
  
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES profiles(id) NOT NULL
    );
  $sql_table4$;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_credit_requests_customer ON order_book_credit_requests(customer_id);
  CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON order_book_credit_requests(status);
  CREATE INDEX IF NOT EXISTS idx_credit_requests_issue ON order_book_credit_requests(issue_id);

  -- ============================================================================
  -- FUNCTION: generate_issue_number()
  -- ============================================================================
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION generate_issue_number()
    RETURNS TEXT AS $func$
    DECLARE
      v_date TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
      v_count INTEGER;
    BEGIN
      SELECT COUNT(*) + 1 INTO v_count
      FROM order_book_issues
      WHERE issue_number LIKE 'ISS-' || v_date || '-%';
      
      RETURN 'ISS-' || v_date || '-' || LPAD(v_count::TEXT, 3, '0');
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- ============================================================================
  -- FUNCTION: generate_credit_request_number()
  -- ============================================================================
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION generate_credit_request_number()
    RETURNS TEXT AS $func$
    DECLARE
      v_date TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
      v_count INTEGER;
    BEGIN
      SELECT COUNT(*) + 1 INTO v_count
      FROM order_book_credit_requests
      WHERE request_number LIKE 'CRD-' || v_date || '-%';
      
      RETURN 'CRD-' || v_date || '-' || LPAD(v_count::TEXT, 3, '0');
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- ============================================================================
  -- TRIGGER: set_issue_number()
  -- ============================================================================
  EXECUTE $sql_func3$
    CREATE OR REPLACE FUNCTION set_issue_number()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW.issue_number IS NULL OR NEW.issue_number = '' THEN
        NEW.issue_number := generate_issue_number();
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func3$;

  DROP TRIGGER IF EXISTS trigger_set_issue_number ON order_book_issues;
  CREATE TRIGGER trigger_set_issue_number
    BEFORE INSERT ON order_book_issues
    FOR EACH ROW
    EXECUTE FUNCTION set_issue_number();

  -- ============================================================================
  -- TRIGGER: set_credit_request_number()
  -- ============================================================================
  EXECUTE $sql_func4$
    CREATE OR REPLACE FUNCTION set_credit_request_number()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := generate_credit_request_number();
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func4$;

  DROP TRIGGER IF EXISTS trigger_set_credit_request_number ON order_book_credit_requests;
  CREATE TRIGGER trigger_set_credit_request_number
    BEFORE INSERT ON order_book_credit_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_credit_request_number();

  -- ============================================================================
  -- VIEW: order_book_product_rating_summary
  -- ============================================================================
  EXECUTE $sql_view1$
    CREATE OR REPLACE VIEW order_book_product_rating_summary AS
SELECT 
  product_id,
  COUNT(*) AS rating_count,
  ROUND(AVG(rating), 2) AS avg_rating,
  ROUND(AVG(taste_rating), 2) AS avg_taste,
  ROUND(AVG(freshness_rating), 2) AS avg_freshness,
  ROUND(AVG(consistency_rating), 2) AS avg_consistency,
  ROUND(AVG(value_rating), 2) AS avg_value
    FROM order_book_product_ratings
    GROUP BY product_id;
  $sql_view1$;

END $$;

