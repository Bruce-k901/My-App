-- Add type column to contractors table
ALTER TABLE contractors ADD COLUMN type text;

-- Set default values based on existing contractor names
UPDATE contractors
SET type = CASE
  WHEN name ILIKE '%ppm%' THEN 'ppm'
  WHEN name ILIKE '%reactive%' THEN 'reactive'
  WHEN name ILIKE '%warranty%' THEN 'warranty'
  ELSE 'ppm'
END;

-- Add constraint to ensure type is one of the valid values
ALTER TABLE contractors ADD CONSTRAINT contractors_type_check 
CHECK (type IN ('ppm', 'reactive', 'warranty'));

-- Update the assign_default_contractors function to use the new type column
CREATE OR REPLACE FUNCTION assign_default_contractors(
  p_site_id uuid,
  p_category text
)
RETURNS TABLE (
  ppm_contractor_id uuid,
  reactive_contractor_id uuid,
  warranty_contractor_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_region text;
BEGIN
  -- Get the site region
  SELECT region INTO v_region FROM sites WHERE id = p_site_id;
  
  IF v_region IS NULL THEN
    RETURN;
  END IF;
  
  -- Return contractors that match the region, category, and type
  RETURN QUERY
  SELECT
    ppm.id AS ppm_contractor_id,
    reactive.id AS reactive_contractor_id,
    warranty.id AS warranty_contractor_id
  FROM contractors ppm
  LEFT JOIN contractors reactive ON 
    reactive.region = v_region 
    AND reactive.category = p_category 
    AND LOWER(reactive.type) = 'reactive'
    AND reactive.is_active = true
  LEFT JOIN contractors warranty ON 
    warranty.region = v_region 
    AND warranty.category = p_category 
    AND LOWER(warranty.type) = 'warranty'
    AND warranty.is_active = true
  WHERE ppm.region = v_region 
    AND ppm.category = p_category 
    AND LOWER(ppm.type) = 'ppm'
    AND ppm.is_active = true
  LIMIT 1;
END;
$$;
