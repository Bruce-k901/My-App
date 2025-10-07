-- Automated temperature alert trigger on temperature_logs

-- Function: insert incident on abnormal temperature
CREATE OR REPLACE FUNCTION public.raise_temperature_incident()
RETURNS trigger AS $$
DECLARE
  reading_value numeric := NEW.reading;
  failed boolean := (reading_value > 8 OR reading_value < -2);
  warning boolean := (reading_value > 5 OR reading_value < 0);
  asset_name text;
BEGIN
  IF NEW.reading IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to fetch asset name for context if available
  SELECT name INTO asset_name FROM public.assets WHERE id = NEW.asset_id;

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

-- Trigger on insert
DROP TRIGGER IF EXISTS trg_temperature_logs_alert ON public.temperature_logs;
CREATE TRIGGER trg_temperature_logs_alert
AFTER INSERT ON public.temperature_logs
FOR EACH ROW EXECUTE FUNCTION public.raise_temperature_incident();