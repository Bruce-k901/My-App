-- ============================================================================
-- Migration: Add notification_config JSONB to task_templates
-- Description: Allows template creators to configure email notifications
--              that fire when a task created from this template is completed.
-- ============================================================================

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.task_templates.notification_config IS
  'Email notification configuration. Shape: { enabled, trigger, subject, message, recipients[] }';
