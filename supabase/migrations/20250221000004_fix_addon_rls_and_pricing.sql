-- Fix RLS policies for company_addon_purchases to allow inserts
-- Add INSERT, UPDATE policies for users belonging to the company

-- Allow users to insert addon purchases for their company
CREATE POLICY company_addon_purchases_insert_own_company
  ON public.company_addon_purchases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
  );

-- Allow users to update their company's addon purchases
CREATE POLICY company_addon_purchases_update_own_company
  ON public.company_addon_purchases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
  );

-- Update the SELECT policy to also check auth_user_id (for consistency)
DROP POLICY IF EXISTS company_addon_purchases_select_own_company ON public.company_addon_purchases;

CREATE POLICY company_addon_purchases_select_own_company
  ON public.company_addon_purchases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.company_id = company_addon_purchases.company_id
    )
  );

-- Update sensor hardware costs to £80 per sensor (all tiers)
UPDATE public.subscription_addons
SET hardware_cost = 80.00
WHERE name LIKE 'smart_sensor_%';

COMMENT ON COLUMN public.subscription_addons.hardware_cost IS 'One-off hardware cost per unit (sensor or tag). Currently £80/sensor for all Smart Sensor tiers.';

