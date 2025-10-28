-- SQL script to create the ingredients_library table for the SOP Playground
-- Run this in your Supabase SQL editor if you want to use real ingredient data

-- Create the ingredients_library table
CREATE TABLE IF NOT EXISTS public.ingredients_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'g',
    allergens TEXT[] DEFAULT '{}',
    default_colour_code TEXT NOT NULL DEFAULT 'White – General',
    food_group TEXT,
    density_g_per_cup DECIMAL(8,2),
    density_g_per_tbsp DECIMAL(8,2),
    density_g_per_tsp DECIMAL(8,2),
    pack_size TEXT,
    supplier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on ingredient_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_ingredients_library_name ON public.ingredients_library(ingredient_name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ingredients_library ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all users to read ingredients (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access to ingredients_library" ON public.ingredients_library
    FOR SELECT USING (true);

-- Create a policy that allows authenticated users to insert/update/delete (adjust as needed)
CREATE POLICY "Allow authenticated users to manage ingredients_library" ON public.ingredients_library
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample data
INSERT INTO public.ingredients_library (
    ingredient_name, category, unit_cost, unit, allergens, default_colour_code, 
    food_group, density_g_per_cup, density_g_per_tbsp, density_g_per_tsp, 
    pack_size, supplier
) VALUES 
    ('Flour', 'Dry Goods', 0.002, 'kg', ARRAY['Gluten'], 'Brown – Bakery', 
     'Grains', 120, 8, 3, '10kg', 'Bakery Supplies Ltd'),
    
    ('Eggs', 'Dairy', 0.15, 'each', ARRAY['Eggs'], 'White – Bakery/Dairy', 
     'Protein', NULL, NULL, NULL, '30 pack', 'Farm Fresh Eggs'),
    
    ('Sugar', 'Dry Goods', 0.003, 'kg', ARRAY[]::TEXT[], 'Brown – Bakery', 
     'Sweeteners', 200, 12, 4, '5kg', 'Sweet Supplies Co'),
    
    ('Butter', 'Dairy', 0.008, 'kg', ARRAY['Dairy'], 'White – Bakery/Dairy', 
     'Fats', 227, 14, 5, '500g', 'Dairy Direct'),
    
    ('Soy Milk', 'Dairy Alternative', 0.003, 'l', ARRAY['Soy'], 'White – Bakery/Dairy', 
     'Beverages', 240, 15, 5, '1L', 'Plant Based Foods'),
    
    ('Ricotta', 'Dairy', 3.20, 'g', ARRAY['Dairy'], 'White – Bakery/Dairy', 
     'Dairy', 250, 15, 5, '500g', 'Italian Delights'),
    
    ('Vinegar', 'Condiments', 10.50, 'L', ARRAY[]::TEXT[], 'Clear – General', 
     'Condiments', 240, 15, 5, '5L', 'Condiment Co')
ON CONFLICT (ingredient_name) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_ingredients_library_updated_at 
    BEFORE UPDATE ON public.ingredients_library 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON public.ingredients_library TO anon;
GRANT SELECT ON public.ingredients_library TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ingredients_library TO authenticated;
