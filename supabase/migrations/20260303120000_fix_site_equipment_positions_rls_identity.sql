-- Fix site_equipment_positions RLS policies to handle both identity patterns.
-- The original policies only check p.id = auth.uid(), which fails for profiles
-- where auth_user_id = auth.uid() but id != auth.uid().
-- This causes 403 Forbidden on INSERT when saving task templates with equipment.

-- Drop all existing policies
DROP POLICY IF EXISTS site_equipment_positions_select_company ON public.site_equipment_positions;
DROP POLICY IF EXISTS site_equipment_positions_insert_company ON public.site_equipment_positions;
DROP POLICY IF EXISTS site_equipment_positions_update_company ON public.site_equipment_positions;
DROP POLICY IF EXISTS site_equipment_positions_delete_company ON public.site_equipment_positions;
DROP POLICY IF EXISTS site_equipment_positions_site ON public.site_equipment_positions;
DROP POLICY IF EXISTS site_equipment_positions_company ON public.site_equipment_positions;

-- Recreate with identity-aware checks (id OR auth_user_id)
CREATE POLICY site_equipment_positions_select
  ON public.site_equipment_positions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = site_equipment_positions.company_id
    )
  );

CREATE POLICY site_equipment_positions_insert
  ON public.site_equipment_positions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = site_equipment_positions.company_id
    )
  );

CREATE POLICY site_equipment_positions_update
  ON public.site_equipment_positions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = site_equipment_positions.company_id
    )
  );

CREATE POLICY site_equipment_positions_delete
  ON public.site_equipment_positions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = site_equipment_positions.company_id
    )
  );
