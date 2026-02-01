-- ============================================================================
-- Migration: 20250306000000_create_planly_schema.sql
-- Description: Complete Planly module database schema
-- Reference: Planly_Cursor_Implementation_Brief.md
-- ============================================================================

SET check_function_bodies = OFF;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Ship state enum
DO $$ BEGIN
  CREATE TYPE ship_state AS ENUM ('baked', 'frozen');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order status enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('confirmed', 'locked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Issue type enum
DO $$ BEGIN
  CREATE TYPE issue_type AS ENUM ('short', 'damaged', 'wrong_item', 'quality');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Issue status enum
DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tray type enum
DO $$ BEGIN
  CREATE TYPE tray_type AS ENUM ('full', 'half', 'ring');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate credit note number
CREATE OR REPLACE FUNCTION generate_credit_note_number(p_site_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_seq INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_seq := nextval('planly_credit_note_seq');
  RETURN 'CN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;


-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check site access
CREATE OR REPLACE FUNCTION has_planly_site_access(target_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM user_site_access usa
      WHERE usa.auth_user_id = auth.uid()
        AND usa.site_id = target_site_id
    )
    OR EXISTS (
      SELECT 1
      FROM profiles p
      JOIN sites s ON s.id = target_site_id
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = s.company_id
        AND (
          p.site_id = target_site_id
          OR p.home_site = target_site_id
          OR LOWER(COALESCE(p.app_role::text, '')) IN ('owner', 'admin', 'area_manager', 'general_manager')
        )
    );
$$;

-- ============================================================================
-- TABLES AND SCHEMA
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and sites tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- ============================================================================
    -- PROCESS TEMPLATES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_process_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_master BOOLEAN DEFAULT false,
      master_template_id UUID REFERENCES planly_process_templates(id) ON DELETE SET NULL,
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
      buffer_days_override INTEGER,
      cutoff_time_override TIME,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id),
      
      CONSTRAINT master_has_no_site CHECK (
        (is_master = true AND site_id IS NULL) OR 
        (is_master = false)
      )
    );

    CREATE INDEX IF NOT EXISTS idx_process_templates_site ON planly_process_templates(site_id);
    CREATE INDEX IF NOT EXISTS idx_process_templates_master ON planly_process_templates(master_template_id);

    -- ============================================================================
    -- PROCESS STAGES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_process_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES planly_process_templates(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      sequence INTEGER NOT NULL,
      day_offset INTEGER NOT NULL, -- Negative number (days before delivery)
      duration_hours DECIMAL(5,2),
      is_overnight BOOLEAN DEFAULT false,
      instructions TEXT,
      sop_id UUID, -- References Checkly SOPs
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(template_id, sequence)
    );

    CREATE INDEX IF NOT EXISTS idx_process_stages_template ON planly_process_stages(template_id);

    -- ============================================================================
    -- STAGE EQUIPMENT (Junction Table)
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_stage_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stage_id UUID NOT NULL REFERENCES planly_process_stages(id) ON DELETE CASCADE,
      equipment_type_id UUID NOT NULL, -- References Assetly equipment types
      is_primary BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(stage_id, equipment_type_id)
    );

    CREATE INDEX IF NOT EXISTS idx_stage_equipment_stage ON planly_stage_equipment(stage_id);

    -- ============================================================================
    -- BAKE GROUPS
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_bake_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      target_temp_celsius INTEGER,
      target_time_mins INTEGER,
      equipment_type_id UUID, -- References Assetly equipment types
      assigned_asset_id UUID, -- References Assetly specific assets
      priority INTEGER NOT NULL DEFAULT 1,
      min_trays_for_efficiency INTEGER,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(site_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_bake_groups_site ON planly_bake_groups(site_id);
    CREATE INDEX IF NOT EXISTS idx_bake_groups_priority ON planly_bake_groups(site_id, priority);

    -- ============================================================================
    -- CUTOFF SETTINGS
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_cutoff_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      default_buffer_days INTEGER NOT NULL DEFAULT 1,
      default_cutoff_time TIME NOT NULL DEFAULT '14:00:00',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(site_id)
    );

    -- ============================================================================
    -- CATEGORIES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      base_prep_type VARCHAR(255),
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(site_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_categories_site ON planly_categories(site_id);

    -- ============================================================================
    -- DESTINATION GROUPS
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_destination_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      bake_deadline TIME,
      dispatch_time TIME,
      is_onsite BOOLEAN DEFAULT false,
      priority INTEGER NOT NULL DEFAULT 1,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(site_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_destination_groups_site ON planly_destination_groups(site_id);

    -- ============================================================================
    -- CUSTOMERS
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      contact_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      postcode VARCHAR(20),
      destination_group_id UUID REFERENCES planly_destination_groups(id) ON DELETE SET NULL,
      default_ship_state ship_state DEFAULT 'baked',
      minimum_order_value DECIMAL(10,2),
      below_minimum_delivery_charge DECIMAL(10,2),
      is_ad_hoc BOOLEAN DEFAULT false,
      frozen_only BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_customers_site ON planly_customers(site_id);
    CREATE INDEX IF NOT EXISTS idx_customers_destination ON planly_customers(destination_group_id);
    CREATE INDEX IF NOT EXISTS idx_customers_active ON planly_customers(site_id, is_active);

    -- ============================================================================
    -- PRODUCT CONFIGURATION
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stockly_product_id UUID NOT NULL, -- References Stockly products
      category_id UUID REFERENCES planly_categories(id) ON DELETE SET NULL,
      process_template_id UUID REFERENCES planly_process_templates(id) ON DELETE SET NULL,
      bake_group_id UUID REFERENCES planly_bake_groups(id) ON DELETE SET NULL,
      items_per_tray INTEGER DEFAULT 18,
      tray_type tray_type DEFAULT 'full',
      can_ship_frozen BOOLEAN DEFAULT false,
      default_ship_state ship_state DEFAULT 'baked',
      is_vatable BOOLEAN DEFAULT true,
      vat_rate DECIMAL(5,2) DEFAULT 20.00,
      is_active BOOLEAN DEFAULT true,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(site_id, stockly_product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_products_site ON planly_products(site_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON planly_products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_bake_group ON planly_products(bake_group_id);
    CREATE INDEX IF NOT EXISTS idx_products_stockly ON planly_products(stockly_product_id);

    -- ============================================================================
    -- PRODUCT LIST PRICES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_product_list_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES planly_products(id) ON DELETE CASCADE,
      list_price DECIMAL(10,2) NOT NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_list_prices_product ON planly_product_list_prices(product_id);
    CREATE INDEX IF NOT EXISTS idx_list_prices_dates ON planly_product_list_prices(product_id, effective_from, effective_to);

    -- ============================================================================
    -- CUSTOMER PRODUCT PRICES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_customer_product_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES planly_customers(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES planly_products(id) ON DELETE CASCADE,
      unit_price DECIMAL(10,2) NOT NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_customer_prices_customer ON planly_customer_product_prices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_customer_prices_product ON planly_customer_product_prices(product_id);
    CREATE INDEX IF NOT EXISTS idx_customer_prices_dates ON planly_customer_product_prices(customer_id, product_id, effective_from, effective_to);

    -- ============================================================================
    -- ORDERS
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES planly_customers(id) ON DELETE CASCADE,
      delivery_date DATE NOT NULL,
      status order_status DEFAULT 'confirmed',
      total_value DECIMAL(10,2),
      notes TEXT,
      locked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer ON planly_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON planly_orders(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON planly_orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_date ON planly_orders(customer_id, delivery_date);

    -- ============================================================================
    -- ORDER LINES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_order_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES planly_orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES planly_products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      unit_price_snapshot DECIMAL(10,2) NOT NULL,
      ship_state ship_state DEFAULT 'baked',
      is_locked BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_order_lines_order ON planly_order_lines(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_lines_product ON planly_order_lines(product_id);

    -- ============================================================================
    -- DELIVERY ISSUES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_delivery_issues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_line_id UUID NOT NULL REFERENCES planly_order_lines(id) ON DELETE CASCADE,
      issue_type issue_type NOT NULL,
      quantity_affected INTEGER NOT NULL,
      description TEXT,
      reported_by UUID REFERENCES auth.users(id),
      reported_at TIMESTAMPTZ DEFAULT NOW(),
      status issue_status DEFAULT 'pending',
      resolved_by UUID REFERENCES auth.users(id),
      resolved_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_delivery_issues_order_line ON planly_delivery_issues(order_line_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_issues_status ON planly_delivery_issues(status);

    -- ============================================================================
    -- CREDIT NOTES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_credit_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      credit_number VARCHAR(50) NOT NULL UNIQUE,
      customer_id UUID NOT NULL REFERENCES planly_customers(id) ON DELETE CASCADE,
      issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_amount DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_credit_notes_customer ON planly_credit_notes(customer_id);
    CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON planly_credit_notes(issue_date);

    -- Create sequence for credit note numbers
    CREATE SEQUENCE IF NOT EXISTS planly_credit_note_seq START 1;

    -- ============================================================================
    -- CREDIT NOTE LINES
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_credit_note_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      credit_note_id UUID NOT NULL REFERENCES planly_credit_notes(id) ON DELETE CASCADE,
      delivery_issue_id UUID REFERENCES planly_delivery_issues(id) ON DELETE SET NULL,
      product_id UUID NOT NULL REFERENCES planly_products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      line_total DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_credit_note_lines_credit ON planly_credit_note_lines(credit_note_id);

    -- ============================================================================
    -- CALENDAR EVENTS (Planly-generated)
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      event_date DATE NOT NULL,
      event_time TIME,
      category VARCHAR(50) NOT NULL, -- 'Tasks', 'Reminders', 'Messages'
      source_reference_id UUID,
      source_reference_type VARCHAR(50), -- 'order', 'production_task', 'alert'
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      visibility_level VARCHAR(50) DEFAULT 'team',
      is_auto_generated BOOLEAN DEFAULT true,
      is_archived BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_events_site_date ON planly_calendar_events(site_id, event_date);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_archived ON planly_calendar_events(is_archived);

    -- ============================================================================
    -- NOTIFICATIONS
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      recipient_role VARCHAR(50),
      source_reference_id UUID,
      source_reference_type VARCHAR(50),
      is_read BOOLEAN DEFAULT false,
      is_portal BOOLEAN DEFAULT false, -- Customer portal notification
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON planly_notifications(recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON planly_notifications(recipient_user_id, is_read);

    -- ============================================================================
    -- SITE SETTINGS (Planly-specific)
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS planly_site_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      credit_approval_required BOOLEAN DEFAULT false,
      credit_auto_approve_threshold DECIMAL(10,2),
      company_name VARCHAR(255),
      company_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(site_id)
    );


    -- ============================================================================
    -- TRIGGERS
    -- ============================================================================

    CREATE TRIGGER update_process_templates_updated_at
      BEFORE UPDATE ON planly_process_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_process_stages_updated_at
      BEFORE UPDATE ON planly_process_stages
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_bake_groups_updated_at
      BEFORE UPDATE ON planly_bake_groups
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON planly_categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_destination_groups_updated_at
      BEFORE UPDATE ON planly_destination_groups
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_customers_updated_at
      BEFORE UPDATE ON planly_customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON planly_products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON planly_orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_order_lines_updated_at
      BEFORE UPDATE ON planly_order_lines
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_cutoff_settings_updated_at
      BEFORE UPDATE ON planly_cutoff_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_site_settings_updated_at
      BEFORE UPDATE ON planly_site_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ============================================================================
    -- ROW LEVEL SECURITY POLICIES
    -- ============================================================================

    -- Enable RLS on all tables
    ALTER TABLE planly_process_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_process_stages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_stage_equipment ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_bake_groups ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_cutoff_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_destination_groups ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_customers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_product_list_prices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_customer_product_prices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_order_lines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_delivery_issues ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_credit_notes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_credit_note_lines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_calendar_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planly_site_settings ENABLE ROW LEVEL SECURITY;

    -- Process Templates Policies
    CREATE POLICY "Users can view process templates for their sites"
      ON planly_process_templates FOR SELECT
      USING (
        site_id IS NULL -- Master templates visible to all
        OR has_planly_site_access(site_id)
      );

    CREATE POLICY "Users can manage process templates for their sites"
      ON planly_process_templates FOR ALL
      USING (
        has_planly_site_access(site_id)
      )
      WITH CHECK (
        has_planly_site_access(site_id)
      );

    -- Process Stages Policies
    CREATE POLICY "Users can view process stages for their sites"
      ON planly_process_stages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_process_templates pt
          WHERE pt.id = planly_process_stages.template_id
            AND (pt.site_id IS NULL OR has_planly_site_access(pt.site_id))
        )
      );

    CREATE POLICY "Users can manage process stages for their sites"
      ON planly_process_stages FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_process_templates pt
          WHERE pt.id = planly_process_stages.template_id
            AND has_planly_site_access(pt.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_process_templates pt
          WHERE pt.id = planly_process_stages.template_id
            AND has_planly_site_access(pt.site_id)
        )
      );

    -- Stage Equipment Policies
    CREATE POLICY "Users can view stage equipment for their sites"
      ON planly_stage_equipment FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_process_stages ps
          JOIN planly_process_templates pt ON ps.template_id = pt.id
          WHERE ps.id = planly_stage_equipment.stage_id
            AND (pt.site_id IS NULL OR has_planly_site_access(pt.site_id))
        )
      );

    CREATE POLICY "Users can manage stage equipment for their sites"
      ON planly_stage_equipment FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_process_stages ps
          JOIN planly_process_templates pt ON ps.template_id = pt.id
          WHERE ps.id = planly_stage_equipment.stage_id
            AND has_planly_site_access(pt.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_process_stages ps
          JOIN planly_process_templates pt ON ps.template_id = pt.id
          WHERE ps.id = planly_stage_equipment.stage_id
            AND has_planly_site_access(pt.site_id)
        )
      );

    -- Bake Groups Policies
    CREATE POLICY "Users can view bake groups for their sites"
      ON planly_bake_groups FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage bake groups for their sites"
      ON planly_bake_groups FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

    -- Cutoff Settings Policies
    CREATE POLICY "Users can view cutoff settings for their sites"
      ON planly_cutoff_settings FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage cutoff settings for their sites"
      ON planly_cutoff_settings FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

    -- Categories Policies
    CREATE POLICY "Users can view categories for their sites"
      ON planly_categories FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage categories for their sites"
      ON planly_categories FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

    -- Destination Groups Policies
    CREATE POLICY "Users can view destination groups for their sites"
      ON planly_destination_groups FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage destination groups for their sites"
      ON planly_destination_groups FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

    -- Customers Policies
    CREATE POLICY "Users can view customers for their sites"
      ON planly_customers FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage customers for their sites"
      ON planly_customers FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

    -- Products Policies
    CREATE POLICY "Users can view products for their sites"
      ON planly_products FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage products for their sites"
      ON planly_products FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

    -- Product List Prices Policies
    CREATE POLICY "Users can view product list prices for their sites"
      ON planly_product_list_prices FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_products p
          WHERE p.id = planly_product_list_prices.product_id
            AND has_planly_site_access(p.site_id)
        )
      );

    CREATE POLICY "Users can manage product list prices for their sites"
      ON planly_product_list_prices FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_products p
          WHERE p.id = planly_product_list_prices.product_id
            AND has_planly_site_access(p.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_products p
          WHERE p.id = planly_product_list_prices.product_id
            AND has_planly_site_access(p.site_id)
        )
      );

    -- Customer Product Prices Policies
    CREATE POLICY "Users can view customer product prices for their sites"
      ON planly_customer_product_prices FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_customer_product_prices.customer_id
            AND has_planly_site_access(c.site_id)
        )
      );

    CREATE POLICY "Users can manage customer product prices for their sites"
      ON planly_customer_product_prices FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_customer_product_prices.customer_id
            AND has_planly_site_access(c.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_customer_product_prices.customer_id
            AND has_planly_site_access(c.site_id)
        )
      );

    -- Orders Policies
    CREATE POLICY "Users can view orders for their sites"
      ON planly_orders FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_orders.customer_id
            AND has_planly_site_access(c.site_id)
        )
      );

    CREATE POLICY "Users can manage orders for their sites"
      ON planly_orders FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_orders.customer_id
            AND has_planly_site_access(c.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_orders.customer_id
            AND has_planly_site_access(c.site_id)
        )
      );

    -- Order Lines Policies
    CREATE POLICY "Users can view order lines for their sites"
      ON planly_order_lines FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_orders o
          JOIN planly_customers c ON c.id = o.customer_id
          WHERE o.id = planly_order_lines.order_id
            AND has_planly_site_access(c.site_id)
        )
      );

    CREATE POLICY "Users can manage order lines for their sites"
      ON planly_order_lines FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_orders o
          JOIN planly_customers c ON c.id = o.customer_id
          WHERE o.id = planly_order_lines.order_id
            AND has_planly_site_access(c.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_orders o
          JOIN planly_customers c ON c.id = o.customer_id
          WHERE o.id = planly_order_lines.order_id
            AND has_planly_site_access(c.site_id)
        )
      );

    -- Delivery Issues Policies
    CREATE POLICY "Users can view delivery issues for their sites"
      ON planly_delivery_issues FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_order_lines ol
          JOIN planly_orders o ON o.id = ol.order_id
          JOIN planly_customers c ON c.id = o.customer_id
          WHERE ol.id = planly_delivery_issues.order_line_id
            AND has_planly_site_access(c.site_id)
        )
      );

    CREATE POLICY "Users can manage delivery issues for their sites"
      ON planly_delivery_issues FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_order_lines ol
          JOIN planly_orders o ON o.id = ol.order_id
          JOIN planly_customers c ON c.id = o.customer_id
          WHERE ol.id = planly_delivery_issues.order_line_id
            AND has_planly_site_access(c.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_order_lines ol
          JOIN planly_orders o ON o.id = ol.order_id
          JOIN planly_customers c ON c.id = o.customer_id
          WHERE ol.id = planly_delivery_issues.order_line_id
            AND has_planly_site_access(c.site_id)
        )
      );

    -- Credit Notes Policies
    CREATE POLICY "Users can view credit notes for their sites"
      ON planly_credit_notes FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_credit_notes.customer_id
            AND has_planly_site_access(c.site_id)
        )
      );

    CREATE POLICY "Users can manage credit notes for their sites"
      ON planly_credit_notes FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_credit_notes.customer_id
            AND has_planly_site_access(c.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_customers c
          WHERE c.id = planly_credit_notes.customer_id
            AND has_planly_site_access(c.site_id)
        )
      );

    -- Credit Note Lines Policies
    CREATE POLICY "Users can view credit note lines for their sites"
      ON planly_credit_note_lines FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planly_credit_notes cn
          JOIN planly_customers c ON c.id = cn.customer_id
          WHERE cn.id = planly_credit_note_lines.credit_note_id
            AND has_planly_site_access(c.site_id)
        )
      );

    CREATE POLICY "Users can manage credit note lines for their sites"
      ON planly_credit_note_lines FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_credit_notes cn
          JOIN planly_customers c ON c.id = cn.customer_id
          WHERE cn.id = planly_credit_note_lines.credit_note_id
            AND has_planly_site_access(c.site_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_credit_notes cn
          JOIN planly_customers c ON c.id = cn.customer_id
          WHERE cn.id = planly_credit_note_lines.credit_note_id
            AND has_planly_site_access(c.site_id)
        )
      );

    -- Calendar Events Policies
    CREATE POLICY "Users can view calendar events for their sites"
      ON planly_calendar_events FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage calendar events for their sites"
      ON planly_calendar_events FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

    -- Notifications Policies
    CREATE POLICY "Users can view their own notifications"
      ON planly_notifications FOR SELECT
      USING (
        recipient_user_id = auth.uid()
        OR recipient_role IN (
          SELECT LOWER(COALESCE(app_role::text, '')) FROM profiles
          WHERE id = auth.uid() OR auth_user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can manage their own notifications"
      ON planly_notifications FOR UPDATE
      USING (recipient_user_id = auth.uid())
      WITH CHECK (recipient_user_id = auth.uid());

    CREATE POLICY "System can create notifications"
      ON planly_notifications FOR INSERT
      WITH CHECK (true); -- System/service role can create notifications

    -- Site Settings Policies
    CREATE POLICY "Users can view site settings for their sites"
      ON planly_site_settings FOR SELECT
      USING (has_planly_site_access(site_id));

    CREATE POLICY "Users can manage site settings for their sites"
      ON planly_site_settings FOR ALL
      USING (has_planly_site_access(site_id))
      WITH CHECK (has_planly_site_access(site_id));

  END IF;
END $$;
