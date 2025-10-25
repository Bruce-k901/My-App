-- Add data integrity constraints and improve validation

-- Add check constraints for better data validation
ALTER TABLE public.assets 
ADD CONSTRAINT chk_assets_category 
CHECK (category IN ('refrigeration', 'heating', 'ventilation', 'electrical', 'plumbing', 'safety', 'other'));

ALTER TABLE public.assets 
ADD CONSTRAINT chk_assets_status 
CHECK (status IN ('active', 'inactive', 'maintenance', 'retired'));

-- Add check constraints for sites
ALTER TABLE public.sites 
ADD CONSTRAINT chk_sites_country 
CHECK (country IN ('UK', 'US', 'CA', 'AU', 'NZ', 'IE'));

-- Add check constraints for contractors
ALTER TABLE public.contractors 
ADD CONSTRAINT chk_contractors_category 
CHECK (category IN ('refrigeration', 'heating', 'ventilation', 'electrical', 'plumbing', 'safety', 'general'));

ALTER TABLE public.contractors 
ADD CONSTRAINT chk_contractors_region 
CHECK (region IN ('north', 'south', 'east', 'west', 'midlands', 'scotland', 'wales', 'northern_ireland'));

-- Add check constraints for tasks
ALTER TABLE public.tasks 
ADD CONSTRAINT chk_tasks_status 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue'));

ALTER TABLE public.tasks 
ADD CONSTRAINT chk_tasks_priority 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add check constraints for notifications
ALTER TABLE public.notifications 
ADD CONSTRAINT chk_notifications_type 
CHECK (type IN ('incident', 'temperature', 'task', 'maintenance', 'digest', 'ppm_due_soon', 'ppm_overdue', 'ppm_completed'));

ALTER TABLE public.notifications 
ADD CONSTRAINT chk_notifications_severity 
CHECK (severity IN ('info', 'warning', 'critical'));

ALTER TABLE public.notifications 
ADD CONSTRAINT chk_notifications_status 
CHECK (status IN ('active', 'archived'));

-- Add check constraints for temperature logs
ALTER TABLE public.temperature_logs 
ADD CONSTRAINT chk_temperature_logs_status 
CHECK (status IN ('ok', 'warning', 'failed'));

ALTER TABLE public.temperature_logs 
ADD CONSTRAINT chk_temperature_logs_day_part 
CHECK (day_part IN ('morning', 'afternoon', 'evening', 'night'));

-- Add check constraints for incidents
ALTER TABLE public.incidents 
ADD CONSTRAINT chk_incidents_type 
CHECK (type IN ('equipment', 'safety', 'food', 'temperature', 'other'));

ALTER TABLE public.incidents 
ADD CONSTRAINT chk_incidents_severity 
CHECK (severity IN ('low', 'medium', 'high'));

ALTER TABLE public.incidents 
ADD CONSTRAINT chk_incidents_status 
CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));

-- Add check constraints for PPM schedule
ALTER TABLE public.ppm_schedule 
ADD CONSTRAINT chk_ppm_schedule_status 
CHECK (status IN ('scheduled', 'due_soon', 'overdue', 'completed'));

ALTER TABLE public.ppm_schedule 
ADD CONSTRAINT chk_ppm_schedule_frequency 
CHECK (frequency_days > 0);

-- Add unique constraints to prevent duplicates
ALTER TABLE public.companies 
ADD CONSTRAINT uq_companies_owner 
UNIQUE (owner_id);

-- Add unique constraints for user roles within company
ALTER TABLE public.user_company_roles 
ADD CONSTRAINT uq_user_company_role 
UNIQUE (user_id, company_id, role);

-- Add unique constraints for site access
ALTER TABLE public.user_site_access 
ADD CONSTRAINT uq_user_site_access 
UNIQUE (user_id, site_id);
