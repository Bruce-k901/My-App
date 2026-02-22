-- ============================================================================
-- Migration: Fix remaining FK indexes + smart unused index cleanup (round 3)
-- This time: only drops unused indexes that do NOT cover any foreign key.
-- ============================================================================

-- ============================================================================
-- PART 1: Create indexes for all unindexed foreign keys
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_applications_company_id ON public.applications (company_id);
CREATE INDEX IF NOT EXISTS idx_callouts_contractor_id ON public.callouts (contractor_id);
CREATE INDEX IF NOT EXISTS idx_glassware_library_company_id ON public.glassware_library (company_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_library_linked_sop_id ON public.ingredients_library (linked_sop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices (subscription_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_site_id ON public.risk_assessments (site_id);
CREATE INDEX IF NOT EXISTS idx_site_checklists_created_by ON public.site_checklists (created_by);
CREATE INDEX IF NOT EXISTS idx_site_compliance_score_tenant_id ON public.site_compliance_score (tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_day_parts_company_id ON public.site_day_parts (company_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_base_unit_id ON stockly.stock_items (base_unit_id);

-- ============================================================================
-- PART 2: Drop unused indexes ONLY if they don't cover any foreign key
-- Uses a dynamic approach to avoid the cascade problem.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  dropped_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Scanning for unused indexes safe to drop ===';

  FOR r IN
    SELECT
      s.schemaname,
      s.relname AS tablename,
      s.indexrelname AS indexname,
      i.indexrelid,
      i.indrelid,
      i.indkey
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON i.indexrelid = s.indexrelid
    WHERE s.idx_scan = 0           -- never used
      AND NOT i.indisunique        -- not a unique index
      AND NOT i.indisprimary       -- not a primary key
      AND s.schemaname IN ('public', 'stockly')
  LOOP
    -- Check if this index covers any foreign key constraint
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = r.indrelid
        AND c.contype = 'f'
        AND c.conkey <@ r.indkey[0:array_length(c.conkey, 1) - 1]
    ) THEN
      -- This index covers a FK - skip it
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Safe to drop
    BEGIN
      EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexname);
      dropped_count := dropped_count + 1;
      RAISE NOTICE 'Dropped: %.%', r.schemaname, r.indexname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to drop %.%: %', r.schemaname, r.indexname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Done: % indexes dropped, % FK-covering indexes preserved ===', dropped_count, skipped_count;
END $$;
