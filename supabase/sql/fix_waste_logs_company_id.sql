-- ============================================================================
-- Fix: Add company_id column to waste_logs if missing
-- Description: Some waste_logs tables may have been created without company_id
-- ============================================================================

-- Check if company_id column exists, if not add it
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waste_logs' 
        AND column_name = 'company_id'
    ) THEN
        -- Add column (nullable first)
        ALTER TABLE waste_logs 
        ADD COLUMN company_id UUID;
        
        -- Update existing rows with company_id from site_id
        UPDATE waste_logs wl
        SET company_id = s.company_id
        FROM sites s
        WHERE wl.site_id = s.id
        AND wl.company_id IS NULL;
        
        -- Make it NOT NULL
        ALTER TABLE waste_logs 
        ALTER COLUMN company_id SET NOT NULL;
        
        -- Add foreign key constraint only if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'waste_logs' 
            AND constraint_name = 'waste_logs_company_id_fkey'
        ) THEN
            ALTER TABLE waste_logs 
            ADD CONSTRAINT waste_logs_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
        
        -- Create index if it doesn't exist
        CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON waste_logs(company_id);
        
        RAISE NOTICE 'Added company_id column to waste_logs table';
    ELSE
        RAISE NOTICE 'company_id column already exists in waste_logs table';
    END IF;
END $$;

-- Verify the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'waste_logs' 
AND column_name = 'company_id';

