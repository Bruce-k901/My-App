-- ============================================
-- Update serving_equipment_library Table Schema
-- ============================================
-- This script:
-- 1. Adds brand column
-- 2. Adds color_coding column
-- 3. Removes breakage_rate column
-- 4. Updates category CHECK constraint to include kitchen equipment
-- Safe to run multiple times (idempotent).

-- Step 1: Add brand column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serving_equipment_library' AND column_name = 'brand') THEN
        ALTER TABLE serving_equipment_library ADD COLUMN brand TEXT;
        RAISE NOTICE 'Column brand added to serving_equipment_library.';
    ELSE
        RAISE NOTICE 'Column brand already exists in serving_equipment_library. No action needed.';
    END IF;
END $$;

-- Step 2: Add color_coding column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serving_equipment_library' AND column_name = 'color_coding') THEN
        ALTER TABLE serving_equipment_library ADD COLUMN color_coding TEXT;
        RAISE NOTICE 'Column color_coding added to serving_equipment_library.';
    ELSE
        RAISE NOTICE 'Column color_coding already exists in serving_equipment_library. No action needed.';
    END IF;
END $$;

-- Step 3: Drop breakage_rate column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serving_equipment_library' AND column_name = 'breakage_rate') THEN
        ALTER TABLE serving_equipment_library DROP COLUMN breakage_rate;
        RAISE NOTICE 'Column breakage_rate dropped from serving_equipment_library.';
    ELSE
        RAISE NOTICE 'Column breakage_rate does not exist in serving_equipment_library. No action needed.';
    END IF;
END $$;

-- Step 4: Update category constraint to include kitchen equipment categories
-- First, drop the existing constraint if it exists
DO $$
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'serving_equipment_library' 
        AND constraint_name LIKE '%category%check%'
    ) THEN
        -- Get the constraint name
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints
            WHERE table_name = 'serving_equipment_library'
            AND constraint_type = 'CHECK'
            AND constraint_name LIKE '%category%'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE serving_equipment_library DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
                RAISE NOTICE 'Dropped old category constraint: %', constraint_name_var;
            END IF;
        END;
    END IF;
END $$;

-- Now add the new constraint with expanded categories
DO $$
BEGIN
    -- Check if we need to add the constraint (it was dropped above or never existed)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'serving_equipment_library' 
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%category%'
    ) THEN
        ALTER TABLE serving_equipment_library 
        ADD CONSTRAINT serving_equipment_library_category_check 
        CHECK (category IN (
            'Platters', 'Bowls', 'Baskets', 'Trays', 'Stands', 'Boards', 'Dishes', 'Holders',
            'Pots & Pans', 'Knives', 'Utensils', 'Tools', 'Mixers', 'Blenders', 'Measuring', 
            'Thermometers', 'Scrapers', 'Strainers', 'Other'
        ));
        RAISE NOTICE 'Added new category constraint with expanded kitchen equipment categories.';
    ELSE
        RAISE NOTICE 'Category constraint already exists. Please manually update if needed.';
    END IF;
END $$;

-- Add comments to new columns
COMMENT ON COLUMN serving_equipment_library.brand IS 'Manufacturer or brand name';
COMMENT ON COLUMN serving_equipment_library.color_coding IS 'Color coding for food safety (e.g., Red, Blue, Green, Yellow, Brown, White)';

