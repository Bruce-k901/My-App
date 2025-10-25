-- Create ppm_schedule table for recurring and one-off maintenance records
CREATE TABLE IF NOT EXISTS ppm_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    last_service_date DATE,
    next_service_date DATE NOT NULL,
    frequency_months INTEGER NOT NULL DEFAULT 12,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'overdue', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ppm_history table for service event logs
CREATE TABLE IF NOT EXISTS ppm_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ppm_id UUID NOT NULL REFERENCES ppm_schedule(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    completed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ppm_schedule_asset_id ON ppm_schedule(asset_id);
CREATE INDEX IF NOT EXISTS idx_ppm_schedule_contractor_id ON ppm_schedule(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ppm_schedule_next_service_date ON ppm_schedule(next_service_date);
CREATE INDEX IF NOT EXISTS idx_ppm_schedule_status ON ppm_schedule(status);
CREATE INDEX IF NOT EXISTS idx_ppm_history_ppm_id ON ppm_history(ppm_id);
CREATE INDEX IF NOT EXISTS idx_ppm_history_service_date ON ppm_history(service_date);

-- Create updated_at trigger for ppm_schedule
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ppm_schedule_updated_at 
    BEFORE UPDATE ON ppm_schedule 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for ppm_schedule
ALTER TABLE ppm_schedule ENABLE ROW LEVEL SECURITY;

-- Policy for admin and owner: full access to company data
CREATE POLICY "Admin and owner can manage all PPM schedules" ON ppm_schedule
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assets a
            JOIN sites s ON a.site_id = s.id
            JOIN user_roles ur ON ur.company_id = s.company_id
            WHERE a.id = ppm_schedule.asset_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'owner')
        )
    );

-- Policy for manager: read-only access to their site
CREATE POLICY "Manager can view PPM schedules for their site" ON ppm_schedule
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assets a
            JOIN sites s ON a.site_id = s.id
            JOIN user_roles ur ON ur.company_id = s.company_id
            WHERE a.id = ppm_schedule.asset_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'manager'
            AND s.id IN (
                SELECT site_id FROM user_site_access 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for ppm_history
ALTER TABLE ppm_history ENABLE ROW LEVEL SECURITY;

-- Policy for admin and owner: full access to company data
CREATE POLICY "Admin and owner can manage all PPM history" ON ppm_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ppm_schedule ps
            JOIN assets a ON ps.asset_id = a.id
            JOIN sites s ON a.site_id = s.id
            JOIN user_roles ur ON ur.company_id = s.company_id
            WHERE ps.id = ppm_history.ppm_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'owner')
        )
    );

-- Policy for manager: read-only access to their site
CREATE POLICY "Manager can view PPM history for their site" ON ppm_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ppm_schedule ps
            JOIN assets a ON ps.asset_id = a.id
            JOIN sites s ON a.site_id = s.id
            JOIN user_roles ur ON ur.company_id = s.company_id
            WHERE ps.id = ppm_history.ppm_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'manager'
            AND s.id IN (
                SELECT site_id FROM user_site_access 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Function to auto-update PPM status based on dates
CREATE OR REPLACE FUNCTION update_ppm_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update status based on next_service_date
    IF NEW.next_service_date < CURRENT_DATE THEN
        NEW.status = 'overdue';
    ELSIF NEW.next_service_date <= CURRENT_DATE + INTERVAL '30 days' THEN
        NEW.status = 'due';
    ELSE
        NEW.status = 'upcoming';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update status on insert/update
CREATE TRIGGER auto_update_ppm_status
    BEFORE INSERT OR UPDATE ON ppm_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_ppm_status();

-- Function to mark PPM as completed and calculate next service date
CREATE OR REPLACE FUNCTION complete_ppm_service(
    ppm_id UUID,
    service_date DATE DEFAULT CURRENT_DATE,
    notes TEXT DEFAULT NULL,
    file_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    ppm_record ppm_schedule%ROWTYPE;
    new_next_date DATE;
    history_id UUID;
BEGIN
    -- Get the PPM record
    SELECT * INTO ppm_record FROM ppm_schedule WHERE id = ppm_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'PPM schedule not found');
    END IF;
    
    -- Calculate new next service date
    new_next_date := service_date + (ppm_record.frequency_months || ' months')::INTERVAL;
    
    -- Update PPM schedule
    UPDATE ppm_schedule 
    SET 
        last_service_date = service_date,
        next_service_date = new_next_date,
        status = 'completed',
        updated_at = NOW()
    WHERE id = ppm_id;
    
    -- Create history record
    INSERT INTO ppm_history (ppm_id, service_date, completed_by, notes, file_url)
    VALUES (ppm_id, service_date, auth.uid(), notes, file_url)
    RETURNING id INTO history_id;
    
    RETURN json_build_object(
        'success', true, 
        'next_service_date', new_next_date,
        'history_id', history_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;