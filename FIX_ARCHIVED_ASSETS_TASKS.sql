-- ============================================================================
-- Fix Tasks for Archived Assets
-- ============================================================================
-- Problem: Tasks (PPM and follow-up) are being created for archived assets
-- Solution: 
--   1. Delete existing tasks for archived assets
--   2. Add check to prevent future tasks for archived assets
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Delete existing tasks for archived assets
-- ============================================================================

-- Delete PPM tasks for archived assets
DELETE FROM checklist_tasks ct
WHERE ct.task_data->>'source_type' = 'ppm_service'
  AND EXISTS (
    SELECT 1 FROM assets a
    WHERE a.id = (ct.task_data->>'asset_id')::uuid
      AND a.archived = true
  );

-- Delete follow-up tasks for archived assets
DELETE FROM checklist_tasks ct
WHERE ct.task_data->>'source_type' = 'callout_followup'
  AND EXISTS (
    SELECT 1 FROM callouts c
    JOIN assets a ON a.id = c.asset_id
    WHERE c.id = (ct.task_data->>'callout_id')::uuid
      AND a.archived = true
  );

-- Also delete tasks that reference archived assets via callout_id column (if it exists)
-- Check if callout_id column exists before trying to use it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checklist_tasks' 
    AND column_name = 'callout_id'
  ) THEN
    DELETE FROM checklist_tasks ct
    WHERE ct.callout_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM callouts c
        JOIN assets a ON a.id = c.asset_id
        WHERE c.id = ct.callout_id
          AND a.archived = true
      );
  END IF;
END $$;

-- ============================================================================
-- Step 2: Create function to check if asset is archived
-- ============================================================================

CREATE OR REPLACE FUNCTION is_asset_archived(p_asset_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived BOOLEAN;
BEGIN
  SELECT archived INTO v_archived
  FROM assets
  WHERE id = p_asset_id;
  
  RETURN COALESCE(v_archived, false);
END;
$$;

COMMENT ON FUNCTION is_asset_archived(UUID) IS 
'Check if an asset is archived. Returns false if asset not found.';

-- ============================================================================
-- Step 3: Create function to check if callout asset is archived
-- ============================================================================

CREATE OR REPLACE FUNCTION is_callout_asset_archived(p_callout_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived BOOLEAN;
BEGIN
  SELECT a.archived INTO v_archived
  FROM callouts c
  JOIN assets a ON a.id = c.asset_id
  WHERE c.id = p_callout_id;
  
  RETURN COALESCE(v_archived, false);
END;
$$;

COMMENT ON FUNCTION is_callout_asset_archived(UUID) IS 
'Check if the asset associated with a callout is archived. Returns false if callout/asset not found.';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check remaining tasks for archived assets (should return 0)
-- Note: Only checks task_data, not callout_id column (which may not exist)
SELECT 
  COUNT(*) as tasks_for_archived_assets
FROM checklist_tasks ct
WHERE (
  -- PPM tasks
  (ct.task_data->>'source_type' = 'ppm_service' 
   AND EXISTS (
     SELECT 1 FROM assets a
     WHERE a.id = (ct.task_data->>'asset_id')::uuid
       AND a.archived = true
   ))
  OR
  -- Follow-up tasks via task_data
  (ct.task_data->>'source_type' = 'callout_followup'
   AND EXISTS (
     SELECT 1 FROM callouts c
     JOIN assets a ON a.id = c.asset_id
     WHERE c.id = (ct.task_data->>'callout_id')::uuid
       AND a.archived = true
   ))
  OR
  -- Follow-up tasks via task_data with ppm_followup source_type
  (ct.task_data->>'source_type' = 'ppm_followup'
   AND EXISTS (
     SELECT 1 FROM callouts c
     JOIN assets a ON a.id = c.asset_id
     WHERE c.id = (ct.task_data->>'callout_id')::uuid
       AND a.archived = true
   ))
);

