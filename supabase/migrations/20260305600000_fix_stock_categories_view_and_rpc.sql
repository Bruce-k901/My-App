-- Fix: public.stock_categories VIEW was created before category_type column
-- was added to stockly.stock_categories. Refresh the view and fix the RPC.

-- Refresh the view to include category_type
DROP VIEW IF EXISTS public.stock_categories CASCADE;
CREATE VIEW public.stock_categories AS
SELECT * FROM stockly.stock_categories;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_categories TO authenticated;

-- Fix RPC to insert directly into stockly schema
CREATE OR REPLACE FUNCTION public.insert_stock_category(
  p_company_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_category_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO stockly.stock_categories (company_id, name, slug, category_type)
  VALUES (p_company_id, p_name, p_slug, p_category_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
