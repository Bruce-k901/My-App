-- Fix calculate_shift_cost trigger to handle pay rates that may violate
-- the rota_shifts_hourly_rate_range constraint (400-50000 pence).
-- If a pay rate is stored in pounds instead of pence (< 100), auto-convert.
-- If the rate is still outside the valid range, set hourly_rate to NULL.

CREATE OR REPLACE FUNCTION public.calculate_shift_cost()
RETURNS TRIGGER AS $func$
DECLARE
  v_rate INTEGER;
  v_multiplier DECIMAL;
  v_hours DECIMAL;
BEGIN
  -- Compute net hours safely (handle overnight)
  v_hours := (
    EXTRACT(
      EPOCH FROM (
        (NEW.shift_date::timestamp + NEW.end_time)
        + (CASE WHEN NEW.end_time <= NEW.start_time THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END)
        - (NEW.shift_date::timestamp + NEW.start_time)
      )
    ) / 3600
  ) - (COALESCE(NEW.break_minutes, 0) / 60.0);

  IF NEW.profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pay_rates'
  ) THEN
    SELECT base_rate,
           CASE WHEN EXTRACT(DOW FROM NEW.shift_date) IN (0, 6)
                THEN weekend_multiplier ELSE 1.0 END
    INTO v_rate, v_multiplier
    FROM public.pay_rates
    WHERE profile_id = NEW.profile_id
      AND effective_to IS NULL;

    -- Auto-correct rates that look like pounds instead of pence
    IF v_rate IS NOT NULL AND v_rate > 0 AND v_rate < 100 THEN
      v_rate := v_rate * 100;
    END IF;

    -- Only set the rate if it falls within the valid constraint range
    IF v_rate IS NOT NULL AND v_rate >= 400 AND v_rate <= 50000 THEN
      NEW.hourly_rate := v_rate;
      NEW.estimated_cost := ROUND(v_hours * v_rate * COALESCE(v_multiplier, 1.0));
    ELSE
      -- Rate is NULL or out of range — don't fail, just skip cost calculation
      NEW.hourly_rate := NULL;
      NEW.estimated_cost := NULL;
    END IF;
  ELSE
    NEW.hourly_rate := NULL;
    NEW.estimated_cost := NULL;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;
