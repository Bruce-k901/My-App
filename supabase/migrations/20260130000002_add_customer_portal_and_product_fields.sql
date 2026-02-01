-- ============================================================================
-- Migration: 20260130000002_add_customer_portal_and_product_fields.sql
-- Description: Add customer portal users table and additional customer/product fields
-- ============================================================================

SET check_function_bodies = OFF;

-- ============================================================================
-- ADD CUSTOMER FIELDS
-- ============================================================================

-- Add new fields to planly_customers table
ALTER TABLE planly_customers
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS finance_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS finance_contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS finance_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS default_payment_terms VARCHAR(20) DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;

-- ============================================================================
-- ADD PRODUCT FIELDS
-- ============================================================================

-- Add new fields to planly_products table
ALTER TABLE planly_products
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for archived products
CREATE INDEX IF NOT EXISTS idx_products_archived ON planly_products(site_id, archived_at);

-- ============================================================================
-- CUSTOMER PORTAL USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS planly_customer_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES planly_customers(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Auth linking
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Invite tracking
  invite_token UUID,
  invite_sent_at TIMESTAMPTZ,
  invite_expires_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,

  -- Login tracking
  last_login_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique email per customer
  UNIQUE(customer_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_users_customer ON planly_customer_portal_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_email ON planly_customer_portal_users(email);
CREATE INDEX IF NOT EXISTS idx_portal_users_token ON planly_customer_portal_users(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_users_auth ON planly_customer_portal_users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_portal_users_updated_at ON planly_customer_portal_users;
CREATE TRIGGER update_portal_users_updated_at
  BEFORE UPDATE ON planly_customer_portal_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE planly_customer_portal_users ENABLE ROW LEVEL SECURITY;

-- Portal users policies
DROP POLICY IF EXISTS "Users can view portal users for their sites" ON planly_customer_portal_users;
CREATE POLICY "Users can view portal users for their sites"
  ON planly_customer_portal_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planly_customers c
      WHERE c.id = planly_customer_portal_users.customer_id
        AND has_planly_site_access(c.site_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage portal users for their sites" ON planly_customer_portal_users;
CREATE POLICY "Users can manage portal users for their sites"
  ON planly_customer_portal_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM planly_customers c
      WHERE c.id = planly_customer_portal_users.customer_id
        AND has_planly_site_access(c.site_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planly_customers c
      WHERE c.id = planly_customer_portal_users.customer_id
        AND has_planly_site_access(c.site_id)
    )
  );

-- Portal users can view their own record
DROP POLICY IF EXISTS "Portal users can view their own record" ON planly_customer_portal_users;
CREATE POLICY "Portal users can view their own record"
  ON planly_customer_portal_users FOR SELECT
  USING (auth_user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE planly_customer_portal_users IS 'Portal users who can log in and place orders on behalf of customers';
COMMENT ON COLUMN planly_customer_portal_users.is_primary IS 'Primary contact receives all notifications';
COMMENT ON COLUMN planly_customer_portal_users.invite_token IS 'One-time token for accepting portal invite';
COMMENT ON COLUMN planly_customer_portal_users.auth_user_id IS 'Linked Supabase auth user after invite accepted';

COMMENT ON COLUMN planly_customers.delivery_instructions IS 'Special instructions for drivers (e.g., use back entrance)';
COMMENT ON COLUMN planly_customers.portal_enabled IS 'Whether customer can use the ordering portal';
COMMENT ON COLUMN planly_customers.default_payment_terms IS 'Payment terms: prepaid, net_7, net_14, net_30, net_60';

COMMENT ON COLUMN planly_products.is_new IS 'Show "New!" badge in portal';
COMMENT ON COLUMN planly_products.is_paused IS 'Temporarily unavailable for ordering';
COMMENT ON COLUMN planly_products.archived_at IS 'Soft delete timestamp for archiving products';
