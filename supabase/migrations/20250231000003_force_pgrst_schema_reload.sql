-- ============================================================================
-- Migration: 20250231000003_force_pgrst_schema_reload.sql
-- Description: Forces PostgREST to reload its schema cache
-- This ensures all new columns (allergens, pack_size, pack_cost) are recognized
-- ============================================================================

-- Notify PostgREST to reload schema cache
-- This is critical after adding new columns to tables
NOTIFY pgrst, 'reload schema';

-- Also try alternative notification method
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

