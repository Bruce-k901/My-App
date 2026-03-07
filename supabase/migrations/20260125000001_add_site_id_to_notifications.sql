-- Add site_id column to notifications (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'site_id'
    ) THEN
        ALTER TABLE notifications
        ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
END $$;

-- Add index for performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_notifications_site_id ON notifications(site_id);

-- Add index for common query pattern (company + site + status)
-- Note: idx_notifications_company_site_status already exists
CREATE INDEX IF NOT EXISTS idx_notifications_company_site_status_updated
ON notifications(company_id, site_id, status);