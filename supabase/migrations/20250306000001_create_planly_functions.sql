-- ============================================================================
-- Migration: 20250306000001_create_planly_functions.sql
-- Description: Create Planly functions that reference planly_* tables
-- Note: This runs after the schema migration to ensure tables exist
-- ============================================================================

SET check_function_bodies = OFF;

-- Drop existing functions if they exist (to handle signature changes)
DROP FUNCTION IF EXISTS generate_credit_note_number(UUID);
DROP FUNCTION IF EXISTS calculate_cutoff_date(DATE, UUID);
DROP FUNCTION IF EXISTS get_product_price(UUID, UUID, DATE);
DROP FUNCTION IF EXISTS lock_orders_past_cutoff();

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

-- Function to calculate product cutoff date
CREATE OR REPLACE FUNCTION calculate_cutoff_date(
  p_delivery_date DATE,
  p_product_id UUID
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_first_stage_offset INTEGER;
  v_buffer_days INTEGER;
  v_cutoff_time TIME;
  v_site_id UUID;
BEGIN
  -- Get site_id from product
  SELECT site_id INTO v_site_id FROM planly_products WHERE id = p_product_id;
  
  -- Get first stage day offset from process template
  SELECT ps.day_offset INTO v_first_stage_offset
  FROM planly_products p
  JOIN planly_process_templates pt ON p.process_template_id = pt.id
  JOIN planly_process_stages ps ON ps.template_id = pt.id
  WHERE p.id = p_product_id
  ORDER BY ps.sequence ASC
  LIMIT 1;
  
  -- Get buffer days and cutoff time (check template override first, then site default)
  SELECT 
    COALESCE(pt.buffer_days_override, cs.default_buffer_days, 1),
    COALESCE(pt.cutoff_time_override, cs.default_cutoff_time, '14:00:00')
  INTO v_buffer_days, v_cutoff_time
  FROM planly_products p
  LEFT JOIN planly_process_templates pt ON p.process_template_id = pt.id
  LEFT JOIN planly_cutoff_settings cs ON cs.site_id = v_site_id
  WHERE p.id = p_product_id;
  
  -- Calculate cutoff: delivery_date - |first_stage_offset| - buffer_days @ cutoff_time
  RETURN (p_delivery_date + v_first_stage_offset - v_buffer_days)::DATE + v_cutoff_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get current price for product/customer
CREATE OR REPLACE FUNCTION get_product_price(
  p_product_id UUID,
  p_customer_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_price DECIMAL(10,2);
BEGIN
  -- Try customer-specific price first
  SELECT unit_price INTO v_price
  FROM planly_customer_product_prices
  WHERE product_id = p_product_id
    AND customer_id = p_customer_id
    AND effective_from <= p_date
    AND (effective_to IS NULL OR effective_to >= p_date)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  IF v_price IS NOT NULL THEN
    RETURN v_price;
  END IF;
  
  -- Fall back to list price
  SELECT list_price INTO v_price
  FROM planly_product_list_prices
  WHERE product_id = p_product_id
    AND effective_from <= p_date
    AND (effective_to IS NULL OR effective_to >= p_date)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN v_price;
END;
$$ LANGUAGE plpgsql;

-- Auto-lock orders when cutoff passes (to be called by cron job)
CREATE OR REPLACE FUNCTION lock_orders_past_cutoff()
RETURNS void AS $$
BEGIN
  UPDATE planly_orders o
  SET status = 'locked', locked_at = NOW()
  WHERE status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM planly_order_lines ol
      JOIN planly_products p ON ol.product_id = p.id
      WHERE ol.order_id = o.id
        AND calculate_cutoff_date(o.delivery_date, p.id) <= NOW()
    );
    
  UPDATE planly_order_lines ol
  SET is_locked = true
  WHERE is_locked = false
    AND EXISTS (
      SELECT 1 FROM planly_orders o
      JOIN planly_products p ON ol.product_id = p.id
      WHERE o.id = ol.order_id
        AND calculate_cutoff_date(o.delivery_date, p.id) <= NOW()
    );
END;
$$ LANGUAGE plpgsql;
