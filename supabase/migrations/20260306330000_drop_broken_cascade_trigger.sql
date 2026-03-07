-- Drop the broken cascade_cost_to_recipes trigger on ingredients_library
-- This trigger calls stockly.cascade_ingredient_cost_change() which references
-- NEW.stock_item_id — a column that doesn't exist on ingredients_library.
-- Cost propagation is already handled by auto_propagate_ingredient_cost trigger.

-- First log what we're about to drop
DO $$
DECLARE
  v_func_def TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_func_def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'stockly' AND p.proname = 'cascade_ingredient_cost_change';

  IF v_func_def IS NOT NULL THEN
    RAISE NOTICE 'Dropping broken function body: %', v_func_def;
  ELSE
    RAISE NOTICE 'Function stockly.cascade_ingredient_cost_change not found (already dropped)';
  END IF;
END $$;

-- Drop the trigger
DROP TRIGGER IF EXISTS cascade_cost_to_recipes ON public.ingredients_library;

-- Drop the function
DROP FUNCTION IF EXISTS stockly.cascade_ingredient_cost_change() CASCADE;
