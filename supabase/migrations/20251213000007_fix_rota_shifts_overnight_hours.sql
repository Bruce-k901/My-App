-- =============================================
-- FIX OVERNIGHT SHIFT HOURS (end_time past midnight)
-- Ensures gross_hours/net_hours never go negative for shifts like 17:00 -> 01:00
-- Also fixes cost trigger to use correct computed hours.
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_shifts') THEN

    -- Replace generated hour columns with an expression that accounts for overnight shifts.
    -- We do this by converting times to timestamps on shift_date, and adding +1 day to end when needed.
    ALTER TABLE public.rota_shifts DROP COLUMN IF EXISTS gross_hours;
    ALTER TABLE public.rota_shifts DROP COLUMN IF EXISTS net_hours;

    ALTER TABLE public.rota_shifts
      ADD COLUMN gross_hours DECIMAL(4,1) GENERATED ALWAYS AS (
        EXTRACT(
          EPOCH FROM (
            (shift_date::timestamp + end_time)
            + (CASE WHEN end_time <= start_time THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END)
            - (shift_date::timestamp + start_time)
          )
        ) / 3600
      ) STORED;

    ALTER TABLE public.rota_shifts
      ADD COLUMN net_hours DECIMAL(4,1) GENERATED ALWAYS AS (
        (
          EXTRACT(
            EPOCH FROM (
              (shift_date::timestamp + end_time)
              + (CASE WHEN end_time <= start_time THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END)
              - (shift_date::timestamp + start_time)
            )
          ) / 3600
        ) - (break_minutes / 60.0)
      ) STORED;

    -- Fix calculate_shift_cost trigger to compute hours safely (BEFORE triggers can't rely on generated values everywhere).
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

        NEW.hourly_rate := v_rate;
        NEW.estimated_cost := ROUND(v_hours * v_rate * v_multiplier);
      ELSE
        NEW.hourly_rate := NULL;
        NEW.estimated_cost := NULL;
      END IF;

      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tr_calculate_shift_cost ON public.rota_shifts;
    CREATE TRIGGER tr_calculate_shift_cost
      BEFORE INSERT OR UPDATE OF profile_id, start_time, end_time, break_minutes
      ON public.rota_shifts
      FOR EACH ROW
      EXECUTE FUNCTION public.calculate_shift_cost();

    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE 'Fixed rota_shifts gross_hours/net_hours for overnight shifts';
  ELSE
    RAISE NOTICE '⚠️ rota_shifts table does not exist yet - skipping overnight shift fix';
  END IF;
END $$;





