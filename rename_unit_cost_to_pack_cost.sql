-- Migration: Rename unit_cost to pack_cost and remove unit_per_pack column
-- Run this in your Supabase SQL Editor

-- Step 1: Rename unit_cost to pack_cost
DO $$
BEGIN
    -- Check if unit_cost exists and pack_cost doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disposables_library' 
        AND column_name = 'unit_cost'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disposables_library' 
        AND column_name = 'pack_cost'
    ) THEN
        -- Rename the column
        ALTER TABLE disposables_library 
        RENAME COLUMN unit_cost TO pack_cost;
        
        RAISE NOTICE 'Column renamed successfully from unit_cost to pack_cost';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disposables_library' 
        AND column_name = 'pack_cost'
    ) THEN
        RAISE NOTICE 'Column pack_cost already exists. No action needed.';
    ELSE
        RAISE NOTICE 'Column unit_cost does not exist. Please check your table structure.';
    END IF;
END $$;

-- Step 2: Drop unit_per_pack column (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'disposables_library' 
        AND column_name = 'unit_per_pack'
    ) THEN
        ALTER TABLE disposables_library 
        DROP COLUMN unit_per_pack;
        
        RAISE NOTICE 'Column unit_per_pack dropped successfully';
    ELSE
        RAISE NOTICE 'Column unit_per_pack does not exist. No action needed.';
    END IF;
END $$;

-- Add a comment to the column for documentation
COMMENT ON COLUMN disposables_library.pack_cost IS 'Cost per pack. Unit cost is calculated as pack_cost / pack_size';
COMMENT ON COLUMN disposables_library.pack_size IS 'Number of units in a pack. Used to calculate unit cost (pack_cost / pack_size)';

-- Verify the changes (uncomment to run)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'disposables_library' 
-- AND column_name IN ('pack_cost', 'pack_size', 'unit_per_pack', 'unit_cost')
-- ORDER BY column_name;

