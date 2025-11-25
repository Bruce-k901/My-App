-- Fix notifications table schema to include missing columns used by the app
-- This migration adds severity, site_id, recipient_role, priority, due_date, and status columns

-- Add site_id column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- Add severity column with check constraint
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'));

-- Add recipient_role column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS recipient_role text;

-- Add priority column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS priority text;

-- Add due_date column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS due_date date;

-- Add status column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS status text;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_site_id ON public.notifications(site_id);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON public.notifications(recipient_role);
