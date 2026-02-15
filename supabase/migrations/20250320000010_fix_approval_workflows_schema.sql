-- =============================================
-- FIX APPROVAL_WORKFLOWS TABLE SCHEMA
-- Ensures all required columns exist
-- =============================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Check if table exists first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows'
    ) THEN
        RAISE NOTICE 'approval_workflows table does not exist - skipping fix_approval_workflows_schema migration';
        RETURN;
    END IF;

    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'name'
    ) THEN
        ALTER TABLE approval_workflows ADD COLUMN name TEXT;
        -- Update existing rows with a default name if any exist
        UPDATE approval_workflows SET name = 'Workflow ' || id::text WHERE name IS NULL;
        -- Make it NOT NULL after setting defaults
        ALTER TABLE approval_workflows ALTER COLUMN name SET NOT NULL;
    END IF;

    -- Add type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'type'
    ) THEN
        ALTER TABLE approval_workflows ADD COLUMN type TEXT;
        -- Set default type
        UPDATE approval_workflows SET type = 'other' WHERE type IS NULL;
        -- Add constraint and make NOT NULL
        ALTER TABLE approval_workflows ADD CONSTRAINT approval_workflows_type_check 
            CHECK (type IN ('rota', 'payroll', 'leave', 'expenses', 'time_off', 'other'));
        ALTER TABLE approval_workflows ALTER COLUMN type SET NOT NULL;
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'description'
    ) THEN
        ALTER TABLE approval_workflows ADD COLUMN description TEXT;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE approval_workflows ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'company_id'
    ) THEN
        -- Only add foreign key if companies table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
            ALTER TABLE approval_workflows ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        ELSE
            ALTER TABLE approval_workflows ADD COLUMN company_id UUID;
        END IF;
        -- Note: You'll need to populate this manually for existing rows
    END IF;

    -- Add created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE approval_workflows ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE approval_workflows ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create index on company_id if it doesn't exist (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_approval_workflows_company_id ON approval_workflows(company_id);
    END IF;
END $$;

-- Ensure unique constraint on company_id + name if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'approval_workflows'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'approval_workflows_company_id_name_key'
        ) THEN
            ALTER TABLE approval_workflows ADD CONSTRAINT approval_workflows_company_id_name_key 
                UNIQUE(company_id, name);
        END IF;
    END IF;
END $$;

