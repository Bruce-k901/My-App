-- Add new fields to planly_customers table
ALTER TABLE planly_customers
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
ADD COLUMN IF NOT EXISTS finance_contact_name TEXT,
ADD COLUMN IF NOT EXISTS finance_contact_email TEXT,
ADD COLUMN IF NOT EXISTS finance_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'net_30' CHECK (default_payment_terms IN ('prepaid', 'net_7', 'net_14', 'net_30', 'net_60')),
ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;

-- Create customer portal users table
CREATE TABLE IF NOT EXISTS planly_customer_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES planly_customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_portal_users_customer ON planly_customer_portal_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_email ON planly_customer_portal_users(email);

-- Enable RLS
ALTER TABLE planly_customer_portal_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal users
CREATE POLICY "Users can view portal users for their site's customers"
  ON planly_customer_portal_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planly_customers c
      JOIN teamly_employee_site_assignments esa ON esa.site_id = c.site_id
      WHERE c.id = planly_customer_portal_users.customer_id
      AND esa.employee_id = (SELECT id FROM teamly_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert portal users for their site's customers"
  ON planly_customer_portal_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planly_customers c
      JOIN teamly_employee_site_assignments esa ON esa.site_id = c.site_id
      WHERE c.id = planly_customer_portal_users.customer_id
      AND esa.employee_id = (SELECT id FROM teamly_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update portal users for their site's customers"
  ON planly_customer_portal_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM planly_customers c
      JOIN teamly_employee_site_assignments esa ON esa.site_id = c.site_id
      WHERE c.id = planly_customer_portal_users.customer_id
      AND esa.employee_id = (SELECT id FROM teamly_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete portal users for their site's customers"
  ON planly_customer_portal_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM planly_customers c
      JOIN teamly_employee_site_assignments esa ON esa.site_id = c.site_id
      WHERE c.id = planly_customer_portal_users.customer_id
      AND esa.employee_id = (SELECT id FROM teamly_employees WHERE user_id = auth.uid())
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_portal_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS portal_users_updated_at ON planly_customer_portal_users;
CREATE TRIGGER portal_users_updated_at
  BEFORE UPDATE ON planly_customer_portal_users
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_users_updated_at();

-- Comment on table
COMMENT ON TABLE planly_customer_portal_users IS 'Portal users who can log in on behalf of customers to place orders';
