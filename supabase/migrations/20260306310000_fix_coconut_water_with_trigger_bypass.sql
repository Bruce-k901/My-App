-- Fix coconut water ingredient pricing by temporarily disabling user triggers
-- The ingredients_library table has a broken trigger referencing NEW.stock_item_id
-- which doesn't exist. DISABLE TRIGGER USER bypasses user triggers without
-- requiring superuser (unlike DISABLE TRIGGER ALL).

-- Step 1: Disable user triggers on ingredients_library
ALTER TABLE public.ingredients_library DISABLE TRIGGER USER;

-- Step 2: Fix the coconut water ingredient
-- £12.99 / 12 bottles = £1.0825 per 1L bottle
-- Each bottle is 1000ml ≈ 1000g
-- So unit_cost = £1.0825 / 1000 = £0.0010825 ≈ £0.0011 per g
UPDATE public.ingredients_library
SET unit_cost = 0.0011,
    pack_size = 1000,
    pack_cost = 1.08,
    unit = 'g'
WHERE ingredient_name ILIKE '%coconut water%vita%'
  AND unit_cost > 0.01;

-- Step 3: Re-enable user triggers
ALTER TABLE public.ingredients_library ENABLE TRIGGER USER;
