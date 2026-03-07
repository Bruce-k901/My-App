-- Diagnostic + fix: Find the trigger function on ingredients_library
-- that references stock_item_id and replace it.
-- This prevents future UPDATE failures on the table.

DO $$
DECLARE
  rec RECORD;
  v_func_body TEXT;
  v_found BOOLEAN := FALSE;
BEGIN
  -- List all triggers on ingredients_library and check their function bodies
  FOR rec IN
    SELECT t.tgname as trigger_name,
           p.proname as function_name,
           n.nspname as function_schema,
           pg_get_functiondef(p.oid) as func_def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace cn ON c.relnamespace = cn.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE cn.nspname = 'public'
      AND c.relname = 'ingredients_library'
      AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'Trigger: %, Function: %.%',
      rec.trigger_name, rec.function_schema, rec.function_name;

    IF rec.func_def ILIKE '%stock_item_id%' THEN
      RAISE NOTICE '  >>> FOUND stock_item_id reference in %!', rec.function_name;
      v_found := TRUE;
    END IF;
  END LOOP;

  IF NOT v_found THEN
    RAISE NOTICE 'No trigger functions on ingredients_library reference stock_item_id';
  END IF;
END $$;
