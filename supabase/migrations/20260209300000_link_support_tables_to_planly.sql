-- Migration: Link customer support tables to planly tables
-- Changes FK references from order_book_* to planly_* tables
-- so the customer portal uses planly as single source of truth.

-- ============================================================
-- 1. MESSAGE THREADS: customer_id → planly_customers
-- ============================================================
ALTER TABLE order_book_message_threads
  DROP CONSTRAINT IF EXISTS order_book_message_threads_customer_id_fkey;

ALTER TABLE order_book_message_threads
  ADD CONSTRAINT order_book_message_threads_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES planly_customers(id) ON DELETE CASCADE;

-- ============================================================
-- 2. ISSUES: customer_id → planly_customers, order_id → planly_orders
-- ============================================================
ALTER TABLE order_book_issues
  DROP CONSTRAINT IF EXISTS order_book_issues_customer_id_fkey;

ALTER TABLE order_book_issues
  ADD CONSTRAINT order_book_issues_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES planly_customers(id) ON DELETE CASCADE;

ALTER TABLE order_book_issues
  DROP CONSTRAINT IF EXISTS order_book_issues_order_id_fkey;

ALTER TABLE order_book_issues
  ADD CONSTRAINT order_book_issues_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES planly_orders(id) ON DELETE SET NULL;

-- ============================================================
-- 3. CREDIT REQUESTS: customer_id → planly_customers, order_id → planly_orders
-- ============================================================
ALTER TABLE order_book_credit_requests
  DROP CONSTRAINT IF EXISTS order_book_credit_requests_customer_id_fkey;

ALTER TABLE order_book_credit_requests
  ADD CONSTRAINT order_book_credit_requests_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES planly_customers(id) ON DELETE CASCADE;

ALTER TABLE order_book_credit_requests
  DROP CONSTRAINT IF EXISTS order_book_credit_requests_order_id_fkey;

ALTER TABLE order_book_credit_requests
  ADD CONSTRAINT order_book_credit_requests_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES planly_orders(id) ON DELETE SET NULL;

-- ============================================================
-- 4. PRODUCT RATINGS: customer_id → planly_customers, product_id → planly_products
-- ============================================================
ALTER TABLE order_book_product_ratings
  DROP CONSTRAINT IF EXISTS order_book_product_ratings_customer_id_fkey;

ALTER TABLE order_book_product_ratings
  ADD CONSTRAINT order_book_product_ratings_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES planly_customers(id) ON DELETE CASCADE;

ALTER TABLE order_book_product_ratings
  DROP CONSTRAINT IF EXISTS order_book_product_ratings_product_id_fkey;

ALTER TABLE order_book_product_ratings
  ADD CONSTRAINT order_book_product_ratings_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES planly_products(id) ON DELETE CASCADE;

-- ============================================================
-- 5. WASTE LOGS: customer_id → planly_customers, order_id → planly_orders
-- ============================================================
ALTER TABLE order_book_waste_logs
  DROP CONSTRAINT IF EXISTS order_book_waste_logs_customer_id_fkey;

ALTER TABLE order_book_waste_logs
  ADD CONSTRAINT order_book_waste_logs_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES planly_customers(id) ON DELETE CASCADE;

ALTER TABLE order_book_waste_logs
  DROP CONSTRAINT IF EXISTS order_book_waste_logs_order_id_fkey;

ALTER TABLE order_book_waste_logs
  ADD CONSTRAINT order_book_waste_logs_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES planly_orders(id) ON DELETE SET NULL;

-- ============================================================
-- 6. WASTE LOG ITEMS: product_id → planly_products
-- ============================================================
ALTER TABLE order_book_waste_log_items
  DROP CONSTRAINT IF EXISTS order_book_waste_log_items_product_id_fkey;

ALTER TABLE order_book_waste_log_items
  ADD CONSTRAINT order_book_waste_log_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES planly_products(id) ON DELETE CASCADE;
