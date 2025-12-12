-- ============================================================================
-- Migration: Migrate old waste_logs to new schema
-- Description: Handle hybrid schema - add new Stockly columns to existing table
-- ============================================================================

BEGIN;

-- Add new Stockly columns to existing waste_logs table
DO $$
DECLARE
    has_old_schema BOOLEAN;
    has_new_schema BOOLEAN;
    row_count INTEGER;
BEGIN
    -- Check for old schema columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waste_logs' 
        AND column_name = 'product'
    ) INTO has_old_schema;
    
    -- Check for new schema columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waste_logs' 
        AND column_name = 'waste_date'
    ) INTO has_new_schema;
    
    -- Get row count
    SELECT COUNT(*) INTO row_count FROM waste_logs;
    
    -- If we have old schema but not new schema, add new columns
    IF has_old_schema AND NOT has_new_schema THEN
        RAISE NOTICE 'Found hybrid waste_logs schema. Adding new Stockly columns...';
        
        -- Add new columns
        ALTER TABLE waste_logs 
        ADD COLUMN IF NOT EXISTS waste_date DATE,
        ADD COLUMN IF NOT EXISTS waste_reason TEXT,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS photo_urls TEXT[],
        ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS checkly_task_id UUID,
        ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles(id),
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Migrate data from old columns to new columns
        UPDATE waste_logs
        SET 
            waste_date = COALESCE(logged_at::date, CURRENT_DATE),
            waste_reason = COALESCE(
                CASE 
                    WHEN reason ILIKE '%expired%' THEN 'expired'
                    WHEN reason ILIKE '%damaged%' THEN 'damaged'
                    WHEN reason ILIKE '%spill%' THEN 'spillage'
                    WHEN reason ILIKE '%overproduction%' THEN 'overproduction'
                    WHEN reason ILIKE '%quality%' THEN 'quality'
                    WHEN reason ILIKE '%customer%return%' THEN 'customer_return'
                    WHEN reason ILIKE '%temperature%' THEN 'temperature_breach'
                    WHEN reason ILIKE '%pest%' THEN 'pest_damage'
                    WHEN reason ILIKE '%theft%' THEN 'theft'
                    WHEN reason ILIKE '%prep%' THEN 'prep_waste'
                    ELSE 'other'
                END,
                'other'
            ),
            notes = COALESCE(
                product || 
                CASE WHEN quantity IS NOT NULL THEN ' - Qty: ' || quantity::text ELSE '' END ||
                CASE WHEN reason IS NOT NULL AND reason != COALESCE(
                    CASE 
                        WHEN reason ILIKE '%expired%' THEN 'expired'
                        WHEN reason ILIKE '%damaged%' THEN 'damaged'
                        WHEN reason ILIKE '%spill%' THEN 'spillage'
                        WHEN reason ILIKE '%overproduction%' THEN 'overproduction'
                        WHEN reason ILIKE '%quality%' THEN 'quality'
                        WHEN reason ILIKE '%customer%return%' THEN 'customer_return'
                        WHEN reason ILIKE '%temperature%' THEN 'temperature_breach'
                        WHEN reason ILIKE '%pest%' THEN 'pest_damage'
                        WHEN reason ILIKE '%theft%' THEN 'theft'
                        WHEN reason ILIKE '%prep%' THEN 'prep_waste'
                        ELSE 'other'
                    END,
                    'other'
                ) THEN ' - Reason: ' || reason ELSE '' END,
                product
            ),
            created_at = COALESCE(logged_at, NOW())
        WHERE waste_date IS NULL;
        
        -- Add check constraint for waste_reason
        ALTER TABLE waste_logs 
        ADD CONSTRAINT waste_logs_waste_reason_check 
        CHECK (waste_reason IN (
            'expired', 'damaged', 'spillage', 'overproduction', 
            'quality', 'customer_return', 'temperature_breach', 
            'pest_damage', 'theft', 'prep_waste', 'other'
        ));
        
        -- Make waste_date and waste_reason NOT NULL (after data migration)
        ALTER TABLE waste_logs 
        ALTER COLUMN waste_date SET NOT NULL,
        ALTER COLUMN waste_reason SET NOT NULL;
        
        -- Ensure company_id is populated
        UPDATE waste_logs wl
        SET company_id = s.company_id
        FROM sites s
        WHERE wl.site_id = s.id
        AND wl.company_id IS NULL;
        
        -- Ensure company_id is NOT NULL
        ALTER TABLE waste_logs 
        ALTER COLUMN company_id SET NOT NULL;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON waste_logs(company_id);
        CREATE INDEX IF NOT EXISTS idx_waste_logs_site ON waste_logs(site_id);
        CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON waste_logs(waste_date DESC);
        CREATE INDEX IF NOT EXISTS idx_waste_logs_reason ON waste_logs(waste_reason);
        
        RAISE NOTICE 'Migration complete. Added new Stockly columns and migrated % rows', row_count;
        
    ELSIF has_new_schema THEN
        RAISE NOTICE 'New waste_logs schema already exists. Ensuring company_id is set.';
        
        -- Ensure company_id exists and is populated
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'waste_logs' 
            AND column_name = 'company_id'
        ) THEN
            ALTER TABLE waste_logs ADD COLUMN company_id UUID;
        END IF;
        
        UPDATE waste_logs wl 
        SET company_id = s.company_id 
        FROM sites s 
        WHERE wl.site_id = s.id 
        AND wl.company_id IS NULL;
        
        ALTER TABLE waste_logs ALTER COLUMN company_id SET NOT NULL;
        
    ELSE
        RAISE NOTICE 'No waste_logs table found. Will be created by migration 20250217000006.';
    END IF;
END $$;

COMMIT;

