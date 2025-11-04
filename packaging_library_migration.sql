-- Migration: Add pack_cost to packaging_library and update schema
-- Run this in your Supabase SQL Editor

-- Step 1: Add pack_cost column (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packaging_library' 
        AND column_name = 'pack_cost'
    ) THEN
        ALTER TABLE packaging_library 
        ADD COLUMN pack_cost NUMERIC(10, 2);
        
        -- Migrate existing data: if unit_cost exists, copy to pack_cost
        UPDATE packaging_library 
        SET pack_cost = unit_cost 
        WHERE unit_cost IS NOT NULL AND pack_cost IS NULL;
        
        RAISE NOTICE 'Column pack_cost added successfully';
    ELSE
        RAISE NOTICE 'Column pack_cost already exists. No action needed.';
    END IF;
END $$;

-- Add a comment to the column for documentation
COMMENT ON COLUMN packaging_library.pack_cost IS 'Cost per pack. Unit cost is calculated as pack_cost / pack_size';
COMMENT ON COLUMN packaging_library.pack_size IS 'Number of units in a pack. Used to calculate unit cost (pack_cost / pack_size)';

-- Verify the changes (uncomment to run)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'packaging_library' 
-- AND column_name IN ('pack_cost', 'pack_size', 'unit_cost')
-- ORDER BY column_name;

