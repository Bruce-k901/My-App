-- =============================================
-- ROTA FORECASTS: broaden RLS to include manager-like roles
-- Fixes "forecasts don't stick" for roles like General Manager / Area Manager / Ops Manager
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_forecasts') THEN
    ALTER TABLE public.rota_forecasts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Managers can manage forecasts" ON public.rota_forecasts;

    CREATE POLICY "Managers can manage forecasts" ON public.rota_forecasts
      FOR ALL USING (
        rota_id IN (
          SELECT id FROM public.rotas
          WHERE company_id = public.get_user_company_id()
        )
        AND public.normalize_role(public.get_user_role()) IN (
          'admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager'
        )
      );

    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE 'Updated rota_forecasts RLS roles';
  ELSE
    RAISE NOTICE '⚠️ rota_forecasts table does not exist yet - skipping rota forecast RLS patch';
  END IF;
END $$;





