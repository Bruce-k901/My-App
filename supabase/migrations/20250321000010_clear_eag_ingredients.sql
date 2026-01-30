-- ============================================================================
-- Migration: 20250321000010_clear_eag_ingredients.sql
-- Description: Clears all ingredients_library data for EAG company
-- ============================================================================

DO $$
DECLARE
  v_eag_company_id UUID;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ingredients_library'
  ) THEN
    RAISE NOTICE 'companies or ingredients_library tables do not exist - skipping clear_eag_ingredients migration';
    RETURN;
  END IF;

  -- Find EAG company by name (case-insensitive)
  SELECT id INTO v_eag_company_id
  FROM public.companies
  WHERE LOWER(name) = 'eag';
  
  -- If EAG company found, delete all ingredients
  IF v_eag_company_id IS NOT NULL THEN
    DELETE FROM ingredients_library
    WHERE company_id = v_eag_company_id;
    
    RAISE NOTICE 'Deleted all ingredients for EAG company (ID: %)', v_eag_company_id;
  ELSE
    RAISE NOTICE 'EAG company not found - skipping ingredient deletion';
  END IF;
END $$;

