-- ============================================================================
-- Migration: Add DELETE trigger for purchase_order_lines view
-- Description: Enables DELETE operations on the purchase_order_lines view
-- ============================================================================

-- Check if purchase_order_lines is a view and add DELETE trigger
DO $$
BEGIN
  -- Check if it's a view
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'purchase_order_lines' AND c.relkind = 'v'
  ) THEN
    -- Create delete trigger function
    CREATE OR REPLACE FUNCTION public.delete_purchase_order_lines()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      DELETE FROM stockly.po_lines WHERE id = OLD.id;
      RETURN OLD;
    END;
    $trigger$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Drop existing trigger if any
    DROP TRIGGER IF EXISTS purchase_order_lines_delete_trigger ON public.purchase_order_lines;

    -- Create the INSTEAD OF DELETE trigger
    CREATE TRIGGER purchase_order_lines_delete_trigger
      INSTEAD OF DELETE ON public.purchase_order_lines
      FOR EACH ROW EXECUTE FUNCTION public.delete_purchase_order_lines();

    RAISE NOTICE 'Added DELETE trigger for purchase_order_lines view';
  ELSE
    RAISE NOTICE 'purchase_order_lines is not a view, skipping trigger creation';
  END IF;
END $$;

-- Also check if purchase_orders needs a DELETE trigger
DO $$
BEGIN
  -- Check if it's a view
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'purchase_orders' AND c.relkind = 'v'
  ) THEN
    -- Create delete trigger function
    CREATE OR REPLACE FUNCTION public.delete_purchase_orders()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      -- First delete lines
      DELETE FROM stockly.po_lines WHERE po_id = OLD.id;
      -- Then delete the order
      DELETE FROM stockly.purchase_orders WHERE id = OLD.id;
      RETURN OLD;
    END;
    $trigger$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Drop existing trigger if any
    DROP TRIGGER IF EXISTS purchase_orders_delete_trigger ON public.purchase_orders;

    -- Create the INSTEAD OF DELETE trigger
    CREATE TRIGGER purchase_orders_delete_trigger
      INSTEAD OF DELETE ON public.purchase_orders
      FOR EACH ROW EXECUTE FUNCTION public.delete_purchase_orders();

    RAISE NOTICE 'Added DELETE trigger for purchase_orders view';
  ELSE
    RAISE NOTICE 'purchase_orders is not a view, skipping trigger creation';
  END IF;
END $$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
