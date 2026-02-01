-- =============================================
-- FIX WORKFLOW_TYPE COLUMN NAME ISSUE
-- The error suggests the column might be named 'workflow_type' instead of 'type'
-- This migration ensures the column exists with the correct name
-- =============================================

DO $$ 
BEGIN
    -- Check if table exists first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows'
    ) THEN
        RAISE NOTICE 'approval_workflows table does not exist - skipping workflow_type column fix';
        RETURN;
    END IF;

    -- Check if column 'workflow_type' exists (the error suggests this might be the actual name)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'workflow_type'
    ) THEN
        -- If workflow_type exists, check if type also exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'type'
        ) THEN
            -- Rename workflow_type to type to match the schema
            ALTER TABLE approval_workflows RENAME COLUMN workflow_type TO type;
            RAISE NOTICE 'Renamed workflow_type column to type';
        ELSE
            -- Both exist - drop workflow_type and keep type
            ALTER TABLE approval_workflows DROP COLUMN workflow_type;
            RAISE NOTICE 'Dropped duplicate workflow_type column, keeping type';
        END IF;
    END IF;
    
    -- Ensure 'type' column exists with correct constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'type'
    ) THEN
        ALTER TABLE approval_workflows ADD COLUMN type TEXT;
        UPDATE approval_workflows SET type = 'other' WHERE type IS NULL;
        ALTER TABLE approval_workflows ALTER COLUMN type SET NOT NULL;
        ALTER TABLE approval_workflows ADD CONSTRAINT approval_workflows_type_check 
            CHECK (type IN ('rota', 'payroll', 'leave', 'expenses', 'time_off', 'other'));
        RAISE NOTICE 'Added type column';
    END IF;
END $$;

