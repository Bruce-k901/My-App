-- Ensure RPC uses SECURITY DEFINER and search_path=public
-- Run this in Supabase SQL editor or include in your migrations.

ALTER FUNCTION public.create_asset_with_ppm(
  p_company_id uuid,
  p_site_id uuid,
  p_type text,
  p_item_name text,
  p_model text,
  p_serial_number text,
  p_category_id uuid,
  p_date_of_purchase date,
  p_warranty_length_years integer,
  p_warranty_callout_info text,
  p_contractor_id uuid,
  p_add_to_ppm boolean,
  p_ppm_services_per_year integer,
  p_document_url text
)
SECURITY DEFINER;

ALTER FUNCTION public.create_asset_with_ppm(
  p_company_id uuid,
  p_site_id uuid,
  p_type text,
  p_item_name text,
  p_model text,
  p_serial_number text,
  p_category_id uuid,
  p_date_of_purchase date,
  p_warranty_length_years integer,
  p_warranty_callout_info text,
  p_contractor_id uuid,
  p_add_to_ppm boolean,
  p_ppm_services_per_year integer,
  p_document_url text
)
SET search_path = public;