-- =============================================
-- SALES FORECASTS (Manual entry per day)
-- =============================================

-- Only create if rotas table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rotas') THEN
    CREATE TABLE IF NOT EXISTS rota_forecasts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rota_id UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
      forecast_date DATE NOT NULL,
      
      -- Sales predictions
      predicted_revenue INTEGER DEFAULT 0, -- pence
      predicted_covers INTEGER DEFAULT 0,
      
      -- Staffing targets
      target_hours DECIMAL(5,1) DEFAULT 0,
      target_labour_cost INTEGER DEFAULT 0, -- pence
      target_labour_percent DECIMAL(4,1) DEFAULT 28.0,
      
      -- Notes
      notes TEXT,
      is_event_day BOOLEAN DEFAULT false, -- special event
      event_name TEXT,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(rota_id, forecast_date)
    );
    
    -- Enable RLS
    ALTER TABLE rota_forecasts ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist, then create fresh ones
    DROP POLICY IF EXISTS "Users can view own company forecasts" ON rota_forecasts;
    DROP POLICY IF EXISTS "Managers can manage forecasts" ON rota_forecasts;
    
    CREATE POLICY "Users can view own company forecasts" ON rota_forecasts
      FOR SELECT USING (
        rota_id IN (SELECT id FROM rotas WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
      );
    
    CREATE POLICY "Managers can manage forecasts" ON rota_forecasts
      FOR ALL USING (
        rota_id IN (SELECT id FROM rotas WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
        AND LOWER((SELECT app_role FROM profiles WHERE id = auth.uid())::text) IN ('admin', 'owner', 'manager')
      );
  ELSE
    RAISE NOTICE '⚠️ rotas table does not exist yet - skipping rota_forecasts table creation';
  END IF;
END $$;

-- =============================================
-- SHIFT TEMPLATES (Reusable shift patterns)
-- =============================================

-- Table already exists, just add missing columns
DO $$ 
BEGIN
  -- Only proceed if shift_templates table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_templates') THEN
    -- Add short_name if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'shift_templates' AND column_name = 'short_name'
    ) THEN
      ALTER TABLE shift_templates ADD COLUMN short_name TEXT;
    END IF;

    -- Add icon if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'shift_templates' AND column_name = 'icon'
    ) THEN
      ALTER TABLE shift_templates ADD COLUMN icon TEXT;
    END IF;

    -- Add min_staff if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'shift_templates' AND column_name = 'min_staff'
    ) THEN
      ALTER TABLE shift_templates ADD COLUMN min_staff INTEGER DEFAULT 1;
    END IF;

    -- Add net_hours if it doesn't exist (as a regular column, not generated)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'shift_templates' AND column_name = 'net_hours'
    ) THEN
      ALTER TABLE shift_templates ADD COLUMN net_hours DECIMAL(4,1);
      
      -- Calculate net_hours for existing rows (handle overnight shifts)
      UPDATE shift_templates 
      SET net_hours = CASE 
        WHEN end_time >= start_time THEN
          ROUND((EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - (break_minutes / 60.0))::numeric, 1)
        ELSE
          ROUND((EXTRACT(EPOCH FROM ((end_time + INTERVAL '24 hours') - start_time)) / 3600 - (break_minutes / 60.0))::numeric, 1)
      END
      WHERE net_hours IS NULL;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ shift_templates table does not exist yet - skipping column additions';
  END IF;
END $$;

-- Seed default templates (only if shift_templates table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_templates') THEN
    INSERT INTO shift_templates (company_id, name, short_name, start_time, end_time, break_minutes, color, sort_order, net_hours)
    SELECT 
      c.id,
      t.name,
      t.short_name,
      t.start_time::TIME,
      t.end_time::TIME,
      t.break_minutes,
      t.color,
      t.sort_order,
      -- Calculate net_hours: handle overnight shifts (end_time < start_time means next day)
      CASE 
        WHEN t.end_time::TIME >= t.start_time::TIME THEN
          ROUND((EXTRACT(EPOCH FROM (t.end_time::TIME - t.start_time::TIME)) / 3600 - (t.break_minutes / 60.0))::numeric, 1)
        ELSE
          ROUND((EXTRACT(EPOCH FROM ((t.end_time::TIME + INTERVAL '24 hours') - t.start_time::TIME)) / 3600 - (t.break_minutes / 60.0))::numeric, 1)
      END as net_hours
    FROM companies c
    CROSS JOIN (VALUES
      ('Opening', 'OPEN', '06:00', '14:00', 30, '#22c55e', 1),
      ('Morning', 'AM', '08:00', '16:00', 30, '#3b82f6', 2),
      ('Mid Shift', 'MID', '11:00', '19:00', 30, '#8b5cf6', 3),
      ('Evening', 'PM', '16:00', '00:00', 30, '#f59e0b', 4),
      ('Closing', 'CLOSE', '18:00', '02:00', 30, '#ef4444', 5),
      ('Split AM', 'SPL-AM', '07:00', '11:00', 0, '#06b6d4', 6),
      ('Split PM', 'SPL-PM', '17:00', '22:00', 0, '#ec4899', 7),
      ('Full Day', 'FULL', '09:00', '21:00', 60, '#64748b', 8)
    ) AS t(name, short_name, start_time, end_time, break_minutes, color, sort_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM shift_templates st 
      WHERE st.company_id = c.id 
      AND (st.short_name = t.short_name OR (st.short_name IS NULL AND st.name = t.name))
    );
  ELSE
    RAISE NOTICE '⚠️ shift_templates table does not exist yet - skipping template seeding';
  END IF;
END $$;

-- RLS for shift_templates (rota_forecasts RLS is handled above)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_templates') THEN
    ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist, then create fresh ones
    DROP POLICY IF EXISTS "Users can view own company templates" ON shift_templates;
    DROP POLICY IF EXISTS "Managers can manage templates" ON shift_templates;

    CREATE POLICY "Users can view own company templates" ON shift_templates
      FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

    CREATE POLICY "Managers can manage templates" ON shift_templates
      FOR ALL USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND LOWER((SELECT app_role FROM profiles WHERE id = auth.uid())::text) IN ('admin', 'owner', 'manager')
      );
  ELSE
    RAISE NOTICE '⚠️ shift_templates table does not exist yet - skipping RLS policy creation';
  END IF;
END $$;

