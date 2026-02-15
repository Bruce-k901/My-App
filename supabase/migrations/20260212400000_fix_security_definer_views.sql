-- ============================================================================
-- Fix SECURITY DEFINER views: compliance_matrix_view, training_stats_view
--
-- These were set to SECURITY INVOKER in migration 20260204400000, but
-- migration 20260210900000 recreated them (DROP + CREATE) without
-- re-applying security_invoker = true, reverting them to SECURITY DEFINER.
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'compliance_matrix_view') THEN
    ALTER VIEW public.compliance_matrix_view SET (security_invoker = true);
    RAISE NOTICE 'Set compliance_matrix_view to SECURITY INVOKER';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'training_stats_view') THEN
    ALTER VIEW public.training_stats_view SET (security_invoker = true);
    RAISE NOTICE 'Set training_stats_view to SECURITY INVOKER';
  END IF;
END $$;
