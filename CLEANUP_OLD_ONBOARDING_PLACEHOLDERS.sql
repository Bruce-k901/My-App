-- =====================================================
-- CLEANUP OLD ONBOARDING PLACEHOLDERS
-- =====================================================
-- Purpose: Remove all old placeholder documents from the previous
--          complicated onboarding system to start fresh with the
--          new simplified 13-document approach.
-- =====================================================

-- STEP 1: Show what will be deleted (for safety)
DO $$ 
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.global_documents
  WHERE is_placeholder = true;
  
  RAISE NOTICE '📊 Found % placeholder documents that will be deleted', v_count;
END $$;

-- STEP 2: Delete all placeholder documents
-- These are safe to delete because they're just templates, not real uploaded files
DELETE FROM public.global_documents
WHERE is_placeholder = true;

-- STEP 3: Show what remains
DO $$ 
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.global_documents;
  
  RAISE NOTICE '✅ Cleanup complete. % real documents remain', v_count;
END $$;

-- STEP 4: Clean up orphaned pack documents
-- Remove any links to documents that no longer exist
DELETE FROM public.company_onboarding_pack_documents
WHERE global_document_id NOT IN (
  SELECT id FROM public.global_documents
);

-- STEP 5: Optional - Remove old packs that are empty
-- Uncomment the following if you want to remove packs with no documents
/*
DELETE FROM public.company_onboarding_packs
WHERE id NOT IN (
  SELECT DISTINCT pack_id 
  FROM public.company_onboarding_pack_documents
);
*/

-- STEP 6: Show final summary
DO $$ 
DECLARE
  v_docs INTEGER;
  v_packs INTEGER;
  v_links INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_docs FROM public.global_documents;
  SELECT COUNT(*) INTO v_packs FROM public.company_onboarding_packs;
  SELECT COUNT(*) INTO v_links FROM public.company_onboarding_pack_documents;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 CLEANUP SUMMARY:';
  RAISE NOTICE '   • Documents remaining: %', v_docs;
  RAISE NOTICE '   • Packs remaining: %', v_packs;
  RAISE NOTICE '   • Pack-Document links: %', v_links;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Ready to run "Create starter kit" to generate the new 13 essential documents';
END $$;
