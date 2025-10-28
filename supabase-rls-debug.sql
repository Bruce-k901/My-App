-- Supabase RLS Debug and Fix Script for ingredients_library table
-- Run this in your Supabase SQL Editor

-- 1. Check if the table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'ingredients_library' 
AND table_schema = 'public';

-- 2. Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'ingredients_library';

-- 3. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'ingredients_library';

-- 4. Create the table if it doesn't exist (uncomment if needed)
/*
CREATE TABLE IF NOT EXISTS ingredients_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    category TEXT,
    unit_cost DECIMAL(10,4),
    unit TEXT,
    allergens TEXT[],
    default_colour_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- 5. Enable RLS if not already enabled
ALTER TABLE ingredients_library ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow all operations on ingredients_library" ON ingredients_library;
DROP POLICY IF EXISTS "Allow read access to ingredients_library" ON ingredients_library;
DROP POLICY IF EXISTS "Allow authenticated users to read ingredients_library" ON ingredients_library;

-- 7. Create a simple allow-all policy for testing (replace with proper policies later)
CREATE POLICY "Allow all operations on ingredients_library" 
ON ingredients_library 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 8. Alternative: Create read-only policy for authenticated users
-- CREATE POLICY "Allow authenticated users to read ingredients_library" 
-- ON ingredients_library 
-- FOR SELECT 
-- TO authenticated 
-- USING (true);

-- 9. Insert some test data
INSERT INTO ingredients_library (ingredient_name, category, unit_cost, unit, allergens, default_colour_code)
VALUES 
    ('Flour', 'Dry Goods', 0.002, 'kg', ARRAY['Gluten'], 'Brown – Bakery'),
    ('Eggs', 'Dairy', 0.15, 'each', ARRAY['Eggs'], 'White – Bakery/Dairy'),
    ('Sugar', 'Dry Goods', 0.003, 'kg', ARRAY[]::TEXT[], 'Brown – Bakery'),
    ('Butter', 'Dairy', 0.008, 'kg', ARRAY['Dairy'], 'White – Bakery/Dairy')
ON CONFLICT (ingredient_name) DO NOTHING;

-- 10. Test the policy
SELECT COUNT(*) as ingredient_count FROM ingredients_library;

-- 11. Check the final state
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ingredients_library') as policy_count
FROM pg_tables 
WHERE tablename = 'ingredients_library';
