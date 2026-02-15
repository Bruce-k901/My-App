-- ============================================================================
-- Migration: Backfill Stock Count Approval Workflow
-- Description: Updates existing stock counts to work with the new approval workflow
-- Date: 2026-01-22
-- ============================================================================

BEGIN;

-- ============================================================================
-- Backfill existing stock counts for approval workflow
-- ============================================================================
DO $$
DECLARE
  v_schema_name TEXT;
  v_table_name TEXT;
  v_counts_updated INTEGER := 0;
BEGIN
  -- Determine which schema has stock_counts
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'stock_counts') THEN
    v_schema_name := 'stockly';
    v_table_name := 'stock_counts';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    v_schema_name := 'public';
    v_table_name := 'stock_counts';
  ELSE
    RAISE NOTICE 'stock_counts table not found in stockly or public schema';
    RETURN;
  END IF;

  RAISE NOTICE 'Backfilling stock counts in schema: %', v_schema_name;

  -- 1. Mark in_progress counts with all items counted as "completed"
  --    (if they have items_counted > 0 and items_counted >= total_items)
  --    IMPORTANT: Only mark as completed if total_items > 0 (exclude brand new counts)
  EXECUTE format('
    UPDATE %I.%I
    SET 
      status = ''completed'',
      completed_at = COALESCE(completed_at, updated_at, created_at),
      completed_by = COALESCE(completed_by, started_by),
      updated_at = NOW()
    WHERE status = ''in_progress''
      AND items_counted > 0
      AND total_items > 0
      AND items_counted >= total_items
      AND completed_at IS NULL',
    v_schema_name, v_table_name
  );
  
  GET DIAGNOSTICS v_counts_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % in_progress counts to completed (all items counted)', v_counts_updated;

  -- 2. Convert pending_review counts to ready_for_approval
  --    (if they have items counted and haven't been reviewed yet)
  EXECUTE format('
    UPDATE %I.%I
    SET 
      status = ''ready_for_approval'',
      ready_for_approval_at = COALESCE(reviewed_at, updated_at, created_at),
      ready_for_approval_by = COALESCE(reviewed_by, completed_by, started_by),
      updated_at = NOW()
    WHERE status = ''pending_review''
      AND items_counted > 0
      AND ready_for_approval_at IS NULL',
    v_schema_name, v_table_name
  );
  
  GET DIAGNOSTICS v_counts_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % pending_review counts to ready_for_approval', v_counts_updated;

  -- 3. For approved counts that aren't finalized, ensure they have approved_by set
  --    (use reviewed_by if approved_by is null)
  EXECUTE format('
    UPDATE %I.%I
    SET 
      approved_by = COALESCE(approved_by, reviewed_by),
      approved_at = COALESCE(approved_at, reviewed_at, updated_at),
      updated_at = NOW()
    WHERE status = ''approved''
      AND (approved_by IS NULL OR approved_at IS NULL)',
    v_schema_name, v_table_name
  );
  
  GET DIAGNOSTICS v_counts_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % approved counts with approved_by/approved_at', v_counts_updated;

  -- 4. For counts that are "active" (old status), convert to "in_progress" if they have items counted
  --    or "completed" if all items are counted
  EXECUTE format('
    UPDATE %I.%I
    SET 
      status = CASE 
        WHEN items_counted > 0 AND total_items > 0 AND items_counted >= total_items THEN ''completed''
        WHEN items_counted > 0 THEN ''in_progress''
        ELSE ''draft''
      END,
      completed_at = CASE 
        WHEN items_counted > 0 AND total_items > 0 AND items_counted >= total_items 
          THEN COALESCE(completed_at, updated_at, created_at)
        ELSE completed_at
      END,
      completed_by = CASE 
        WHEN items_counted > 0 AND total_items > 0 AND items_counted >= total_items 
          THEN COALESCE(completed_by, started_by)
        ELSE completed_by
      END,
      updated_at = NOW()
    WHERE status = ''active''
      AND status != ''finalized''
      AND status != ''locked''',
    v_schema_name, v_table_name
  );
  
  GET DIAGNOSTICS v_counts_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % active counts to appropriate status', v_counts_updated;

  -- 5. For any counts that are "finalized" or "locked", ensure they have completed_at set
  --    (stockly.stock_counts has no finalized_at/locked_at; use updated_at/created_at/started_by only)
  EXECUTE format('
    UPDATE %I.%I
    SET 
      completed_at = COALESCE(completed_at, updated_at, created_at),
      completed_by = COALESCE(completed_by, reviewed_by, started_by),
      updated_at = NOW()
    WHERE status IN (''finalized'', ''locked'')
      AND completed_at IS NULL',
    v_schema_name, v_table_name
  );
  
  GET DIAGNOSTICS v_counts_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % finalized/locked counts with completed_at', v_counts_updated;

  RAISE NOTICE 'Backfill completed successfully';
END $$;

COMMIT;
