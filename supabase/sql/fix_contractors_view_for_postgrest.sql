-- Fix contractors view to ensure PostgREST recognizes contact_name
-- This recreates the view and adds an INSTEAD OF trigger for inserts

-- Step 1: Drop existing view and triggers
DROP TRIGGER IF EXISTS contractors_insert_trigger ON public.contractors;
DROP TRIGGER IF EXISTS contractors_update_trigger ON public.contractors;
DROP VIEW IF EXISTS public.contractors CASCADE;

-- Step 2: Recreate the view with explicit column definitions
CREATE VIEW public.contractors AS
SELECT 
  id,
  company_id,
  category,
  name,
  contact_name,  -- Explicitly include contact_name
  email,
  phone,
  emergency_phone AS ooh_phone,
  emergency_phone AS ooh,
  address,
  contract_start,
  contract_expiry,
  contract_file,
  notes,
  created_at,
  updated_at,
  true AS is_active,
  NULL::text AS region,
  NULL::text AS website,
  NULL::text AS postcode,
  NULL::numeric AS hourly_rate,
  NULL::numeric AS callout_fee
FROM public.maintenance_contractors;

-- Step 3: Enable RLS
ALTER VIEW public.contractors SET (security_invoker = true);

-- Step 4: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;

-- Step 5: Create INSTEAD OF trigger for INSERT
CREATE OR REPLACE FUNCTION public.contractors_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_row public.maintenance_contractors%ROWTYPE;
BEGIN
  -- Insert into the underlying maintenance_contractors table
  INSERT INTO public.maintenance_contractors (
    company_id,
    category,
    name,
    contact_name,
    email,
    phone,
    emergency_phone,
    address,
    notes,
    created_at,
    updated_at
  ) VALUES (
    NEW.company_id,
    NEW.category,
    NEW.name,
    NEW.contact_name,  -- Map contact_name from view to table
    NEW.email,
    NEW.phone,
    COALESCE(NEW.ooh_phone, NEW.ooh),
    NEW.address,
    NEW.notes,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  RETURNING * INTO inserted_row;
  
  -- Map the inserted row back to the view structure
  NEW.id := inserted_row.id;
  NEW.company_id := inserted_row.company_id;
  NEW.category := inserted_row.category;
  NEW.name := inserted_row.name;
  NEW.contact_name := inserted_row.contact_name;
  NEW.email := inserted_row.email;
  NEW.phone := inserted_row.phone;
  NEW.ooh_phone := inserted_row.emergency_phone;
  NEW.ooh := inserted_row.emergency_phone;
  NEW.address := inserted_row.address;
  NEW.notes := inserted_row.notes;
  NEW.created_at := inserted_row.created_at;
  NEW.updated_at := inserted_row.updated_at;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER contractors_insert_trigger
INSTEAD OF INSERT ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.contractors_insert();

-- Step 6: Create INSTEAD OF trigger for UPDATE
CREATE OR REPLACE FUNCTION public.contractors_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the underlying maintenance_contractors table
  UPDATE public.maintenance_contractors
  SET
    company_id = NEW.company_id,
    category = NEW.category,
    name = NEW.name,
    contact_name = NEW.contact_name,  -- Map contact_name from view to table
    email = NEW.email,
    phone = NEW.phone,
    emergency_phone = COALESCE(NEW.ooh_phone, NEW.ooh),
    address = NEW.address,
    notes = NEW.notes,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER contractors_update_trigger
INSTEAD OF UPDATE ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.contractors_update();

-- Step 7: Force PostgREST to see the view by querying it
-- This helps refresh the schema cache
DO $$
BEGIN
  PERFORM * FROM public.contractors LIMIT 1;
END $$;

