-- Migration: Add Critical Performance Indexes
-- Priority: P1 - CRITICAL
-- Description: Add missing indexes for high-traffic queries
-- Expected Impact: 60% of performance gains

-- ============================================
-- PLANLY ORDERS - Most queried table
-- ============================================

-- Used in: production-plan, delivery-notes, delivery-schedule
-- Composite index for common filter pattern
CREATE INDEX IF NOT EXISTS idx_planly_orders_delivery_status
    ON planly_orders(delivery_date, status);

-- Note: idx_orders_customer_date already exists from original schema

-- ============================================
-- PLANLY ORDER LINES - Always joined with orders
-- ============================================

-- Used in: all order detail queries - composite for common JOIN pattern
CREATE INDEX IF NOT EXISTS idx_planly_order_lines_order_product
    ON planly_order_lines(order_id, product_id);

-- ============================================
-- PLANLY PRODUCTS - Filtered by site and bake_group
-- ============================================

-- Used in: delivery-notes, production-plan filtered queries
-- Partial index for active products only
CREATE INDEX IF NOT EXISTS idx_planly_products_site_bake_active
    ON planly_products(site_id, bake_group_id) WHERE is_active = true;

-- Used in: product lookups with process templates
CREATE INDEX IF NOT EXISTS idx_planly_products_process_template
    ON planly_products(process_template_id) WHERE process_template_id IS NOT NULL;

-- ============================================
-- PLANLY CUSTOMERS - Filtered by site and status
-- ============================================

-- Note: idx_customers_active already exists from original schema (site_id, is_active)

-- Used in: delivery schedule filtering - partial index for delivery customers
CREATE INDEX IF NOT EXISTS idx_planly_customers_needs_delivery
    ON planly_customers(site_id, needs_delivery) WHERE needs_delivery = true;

-- ============================================
-- ORDER BOOK - RLS policies use company_id
-- ============================================

-- Used in: RLS policy checks
CREATE INDEX IF NOT EXISTS idx_order_book_customers_company
    ON order_book_customers(company_id);

CREATE INDEX IF NOT EXISTS idx_order_book_suppliers_company
    ON order_book_suppliers(company_id);

-- Used in: order book product lookups
CREATE INDEX IF NOT EXISTS idx_order_book_products_supplier
    ON order_book_products(supplier_id);

-- ============================================
-- PLANLY PROCESS STAGES (template stages)
-- ============================================

-- Used in: production plan stage lookups
CREATE INDEX IF NOT EXISTS idx_process_stages_template_offset
    ON planly_process_stages(template_id, day_offset);
