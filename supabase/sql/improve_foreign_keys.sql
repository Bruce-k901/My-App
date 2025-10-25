-- Add missing foreign key constraints for better data integrity

-- Add foreign key constraints to assets table
ALTER TABLE public.assets 
ADD CONSTRAINT fk_assets_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.assets 
ADD CONSTRAINT fk_assets_site 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

-- Add foreign key constraints to sites table
ALTER TABLE public.sites 
ADD CONSTRAINT fk_sites_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add foreign key constraints to contractors table
ALTER TABLE public.contractors 
ADD CONSTRAINT fk_contractors_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add foreign key constraints to tasks table
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_site 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

-- Add foreign key constraints to notifications table
ALTER TABLE public.notifications 
ADD CONSTRAINT fk_notifications_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.notifications 
ADD CONSTRAINT fk_notifications_site 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;

-- Add foreign key constraints to temperature_logs table
ALTER TABLE public.temperature_logs 
ADD CONSTRAINT fk_temperature_logs_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.temperature_logs 
ADD CONSTRAINT fk_temperature_logs_site 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE public.temperature_logs 
ADD CONSTRAINT fk_temperature_logs_asset 
FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

-- Add foreign key constraints to incidents table
ALTER TABLE public.incidents 
ADD CONSTRAINT fk_incidents_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.incidents 
ADD CONSTRAINT fk_incidents_site 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

-- Add foreign key constraints to task_events table
ALTER TABLE public.task_events 
ADD CONSTRAINT fk_task_events_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.task_events 
ADD CONSTRAINT fk_task_events_site 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE public.task_events 
ADD CONSTRAINT fk_task_events_task 
FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
