-- Create INSTEAD OF trigger on contractors view to handle inserts
-- This allows inserts into the 'contractors' view to work properly

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS contractors_insert_trigger ON public.contractors;

-- Create function to handle inserts
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
    NEW.contact_name,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.ooh_phone, NEW.ooh), -- Map ooh_phone/ooh to emergency_phone
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

-- Create INSTEAD OF trigger for INSERT
CREATE TRIGGER contractors_insert_trigger
INSTEAD OF INSERT ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.contractors_insert();

-- Create function to handle updates
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
    contact_name = NEW.contact_name,
    email = NEW.email,
    phone = NEW.phone,
    emergency_phone = COALESCE(NEW.ooh_phone, NEW.ooh), -- Map ooh_phone/ooh to emergency_phone
    address = NEW.address,
    notes = NEW.notes,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create INSTEAD OF trigger for UPDATE
DROP TRIGGER IF EXISTS contractors_update_trigger ON public.contractors;
CREATE TRIGGER contractors_update_trigger
INSTEAD OF UPDATE ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.contractors_update();

