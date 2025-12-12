-- ============================================================================
-- Check waste_logs table conflict
-- Description: There may be an old waste_logs table with different schema
-- ============================================================================

-- Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'waste_logs' 
ORDER BY ordinal_position;

-- Check if there are any rows
SELECT COUNT(*) as row_count FROM waste_logs;

-- Check constraints
SELECT 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'waste_logs';

-- Check if this is the OLD schema (has 'product' column)
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'waste_logs' 
    AND column_name = 'product'
) as has_old_schema;

-- Check if this is the NEW schema (has 'waste_date' column)
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'waste_logs' 
    AND column_name = 'waste_date'
) as has_new_schema;

