-- ============================================================================
-- Migration: SALSA — Grant access on stockly schema tables
-- Description: Adds GRANT ALL on underlying stockly schema tables to
--              authenticated role. Required because views use
--              security_invoker = true, so the invoker needs direct
--              access to the underlying tables for SELECT queries.
--              INSERT/UPDATE/DELETE are handled by SECURITY DEFINER
--              INSTEAD OF triggers, but SELECT still requires direct grants.
-- ============================================================================

-- Phase 1: Batch Tracking Core
GRANT ALL ON stockly.stock_batches TO authenticated;
GRANT ALL ON stockly.batch_movements TO authenticated;

-- Phase 2: Supplier Approval & Specs
GRANT ALL ON stockly.supplier_documents TO authenticated;
GRANT ALL ON stockly.product_specifications TO authenticated;
GRANT ALL ON stockly.product_specification_history TO authenticated;
GRANT ALL ON stockly.supplier_approval_log TO authenticated;

-- Phase 3: Production Batch Records
GRANT ALL ON stockly.production_batches TO authenticated;
GRANT ALL ON stockly.production_batch_inputs TO authenticated;
GRANT ALL ON stockly.production_batch_outputs TO authenticated;
GRANT ALL ON stockly.production_ccp_records TO authenticated;

-- Phase 4: Traceability & Recalls
GRANT ALL ON stockly.recalls TO authenticated;
GRANT ALL ON stockly.recall_affected_batches TO authenticated;
GRANT ALL ON stockly.recall_notifications TO authenticated;
GRANT ALL ON stockly.batch_dispatch_records TO authenticated;

-- Phase 5: Calibration & Non-Conformances
GRANT ALL ON stockly.asset_calibrations TO authenticated;
GRANT ALL ON stockly.non_conformances TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
