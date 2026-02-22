-- Add source_library column for audit trail on auto-created supplier placeholders
-- Tracks which library page (or CSV upload) auto-created a placeholder supplier

ALTER TABLE stockly.suppliers
  ADD COLUMN IF NOT EXISTS source_library TEXT;

-- Partial index for filtering placeholders by source
CREATE INDEX IF NOT EXISTS idx_suppliers_source_library
  ON stockly.suppliers(source_library)
  WHERE source_library IS NOT NULL;

COMMENT ON COLUMN stockly.suppliers.source_library
  IS 'Which library page auto-created this supplier placeholder (ingredients, packaging, chemicals, disposables, ppe, first_aid, csv_upload)';

-- Recreate public.suppliers view to include new column
DO $$
BEGIN
  DROP VIEW IF EXISTS public.suppliers CASCADE;
  CREATE VIEW public.suppliers AS SELECT * FROM stockly.suppliers;
  ALTER VIEW public.suppliers SET (security_invoker = true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon;

  -- Recreate INSTEAD OF triggers if the functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_insert_trigger
      INSTEAD OF INSERT ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.insert_suppliers();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_update_trigger
      INSTEAD OF UPDATE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.update_suppliers();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_delete_trigger
      INSTEAD OF DELETE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.delete_suppliers();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
