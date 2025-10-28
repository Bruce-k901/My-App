-- =====================================================
-- COMPLIANCE SYSTEM DATABASE SCHEMA
-- Temperature Checks (SFBB Compliant)
-- =====================================================

-- Table 1: Compliance Task Templates
CREATE TABLE compliance_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  regulation_type TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  min_instances_per_day INT DEFAULT 2,
  icon TEXT DEFAULT '🌡️',
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Table 2: Site Compliance Tasks (Deployed Tasks)
CREATE TABLE site_compliance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES compliance_task_templates(id),
  daypart TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_cloned_from UUID REFERENCES site_compliance_tasks(id),
  deployed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_site_compliance_site_id ON site_compliance_tasks(site_id);
CREATE INDEX idx_site_compliance_active ON site_compliance_tasks(is_active);

-- Table 3: Compliance Task Equipment (Equipment assigned to task)
CREATE TABLE compliance_task_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_compliance_task_id UUID NOT NULL REFERENCES site_compliance_tasks(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  temp_min INT,
  temp_max INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_compliance_equipment_task ON compliance_task_equipment(site_compliance_task_id);

-- Table 4: Compliance Task Instances (Actual tasks to complete)
CREATE TABLE compliance_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_compliance_task_id UUID NOT NULL REFERENCES site_compliance_tasks(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  due_date DATE NOT NULL,
  due_daypart TEXT NOT NULL,
  due_start_time TIME,
  due_end_time TIME,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES auth.users(id),
  completed_data JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_compliance_instances_site_date ON compliance_task_instances(site_id, due_date);
CREATE INDEX idx_compliance_instances_status ON compliance_task_instances(status);

-- Table 5: Compliance Records (Audit trail)
CREATE TABLE compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES compliance_task_instances(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_compliance_records_site ON compliance_records(site_id);

-- Table 6: Monitoring Tasks (Auto-created for out-of-range)
CREATE TABLE monitoring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_compliance_task_id UUID NOT NULL REFERENCES site_compliance_tasks(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  triggered_by_instance_id UUID NOT NULL REFERENCES compliance_task_instances(id),
  triggered_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  check_frequency_hours INT NOT NULL,
  last_recorded_temp DECIMAL(5,2),
  due_date DATE NOT NULL,
  due_time TIME NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_monitoring_site ON monitoring_tasks(site_id);

-- Update assets table to add temp ranges
ALTER TABLE assets ADD COLUMN IF NOT EXISTS temp_min INT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS temp_max INT;

-- Update sites table to add dayparts (JSON array)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS dayparts TEXT[] DEFAULT ARRAY['Pre Service', 'During Service', 'Close'];

-- Seed Temperature Checks template
INSERT INTO compliance_task_templates (name, description, regulation_type, category, frequency, min_instances_per_day)
VALUES (
  'Temperature Checks',
  'Daily monitoring of all chilled and frozen storage areas to ensure compliance with cold chain requirements (SFBB 2x daily minimum)',
  'SFBB',
  'Temperature',
  'Daily',
  2
);

-- RLS Policies
ALTER TABLE compliance_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_task_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_tasks ENABLE ROW LEVEL SECURITY;

-- Templates are public (read-only for all authenticated users)
CREATE POLICY "Templates are viewable by authenticated users" ON compliance_task_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Site tasks are viewable by users from the same company
CREATE POLICY "Site compliance tasks are viewable by company users" ON site_compliance_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites s 
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE s.id = site_compliance_tasks.site_id 
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Site compliance tasks are manageable by company admins" ON site_compliance_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sites s 
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE s.id = site_compliance_tasks.site_id 
      AND p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Equipment follows same pattern
CREATE POLICY "Compliance equipment is viewable by company users" ON compliance_task_equipment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM site_compliance_tasks sct
      JOIN sites s ON sct.site_id = s.id
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE sct.id = compliance_task_equipment.site_compliance_task_id 
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Compliance equipment is manageable by company admins" ON compliance_task_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM site_compliance_tasks sct
      JOIN sites s ON sct.site_id = s.id
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE sct.id = compliance_task_equipment.site_compliance_task_id 
      AND p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Instances are viewable by site users
CREATE POLICY "Compliance instances are viewable by site users" ON compliance_task_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites s 
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE s.id = compliance_task_instances.site_id 
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Compliance instances are manageable by site users" ON compliance_task_instances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sites s 
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE s.id = compliance_task_instances.site_id 
      AND p.id = auth.uid()
    )
  );

-- Records follow same pattern
CREATE POLICY "Compliance records are viewable by company users" ON compliance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites s 
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE s.id = compliance_records.site_id 
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Compliance records are manageable by site users" ON compliance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites s 
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE s.id = compliance_records.site_id 
      AND p.id = auth.uid()
    )
  );

-- Monitoring tasks follow same pattern
CREATE POLICY "Monitoring tasks are viewable by site users" ON monitoring_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM site_compliance_tasks sct
      JOIN sites s ON sct.site_id = s.id
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE sct.id = monitoring_tasks.site_compliance_task_id 
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Monitoring tasks are manageable by site users" ON monitoring_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM site_compliance_tasks sct
      JOIN sites s ON sct.site_id = s.id
      JOIN profiles p ON s.company_id = p.company_id 
      WHERE sct.id = monitoring_tasks.site_compliance_task_id 
      AND p.id = auth.uid()
    )
  );
