-- Update temperature alert trigger to use asset-specific working temperature ranges
-- Falls back to hardcoded values for backward compatibility with assets that don't have ranges set

CREATE OR REPLACE FUNCTION public.raise_temperature_incident()
RETURNS trigger AS $$
DECLARE
  reading_value numeric := NEW.reading;
  asset_min_temp numeric;
  asset_max_temp numeric;
  asset_name text;
  failed boolean := false;
  tolerance numeric := 2;
  warning_tolerance numeric := 1;
  effective_min numeric;
  effective_max numeric;
BEGIN
  IF NEW.reading IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch asset details including temperature ranges
  SELECT 
    a.name,
    a.working_temp_min,
    a.working_temp_max
  INTO 
    asset_name,
    asset_min_temp,
    asset_max_temp
  FROM public.assets a 
  WHERE a.id = NEW.asset_id;

  -- Use asset-specific ranges if available
  IF asset_min_temp IS NOT NULL OR asset_max_temp IS NOT NULL THEN
    effective_min := COALESCE(asset_min_temp, -999999);
    effective_max := COALESCE(asset_max_temp, 999999);
    
    -- Check for failed (outside range + tolerance)
    IF reading_value > (effective_max + tolerance) OR reading_value < (effective_min - tolerance) THEN
      failed := true;
    END IF;
  ELSE
    -- Fallback to hardcoded values for backward compatibility
    failed := (reading_value > 8 OR reading_value < -2);
  END IF;

  -- Only create incident for failed readings (per spec)
  IF failed THEN
    INSERT INTO public.incidents (company_id, site_id, type, description, severity, status)
    VALUES (
      NEW.company_id,
      NEW.site_id,
      'Temperature Alert',
      CONCAT('Abnormal reading on ', COALESCE(asset_name, 'asset'), ': ', NEW.reading, '°C'),
      'high',
      'open'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so this migration just updates the function

