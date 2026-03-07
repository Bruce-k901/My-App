-- Re-fix coconut water after full ingredient sync overwrote previous fix.
-- Excel has case-based pricing (12 bottles @ £12.99), but recipes use grams.
-- Convert to per-gram: 12 bottles × 1000g = 12000g total, £12.99 / 12000 = £0.0011/g

UPDATE public.ingredients_library
SET unit_cost = 0.0011,
    pack_size = 12000,
    pack_cost = 12.99,
    unit = 'g'
WHERE ingredient_name ILIKE '%coconut water%vita%';
