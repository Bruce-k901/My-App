-- ============================================================================
-- Add columns to support WhatsApp automation triggers
-- ============================================================================

-- Track whether a delivery reminder has been sent for a PO
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS wa_reminder_sent timestamptz DEFAULT NULL;

-- Track whether an overdue WhatsApp alert has been sent for a task
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS wa_overdue_alert_sent timestamptz DEFAULT NULL;

-- Track follow-up status on outbound callout messages
-- NULL = no follow-up needed yet, 'replied' = contractor responded, timestamp = follow-up sent
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS followup_sent text DEFAULT NULL;

-- Index for efficient delivery reminder queries (tomorrow's deliveries not yet reminded)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_wa_reminder
  ON public.purchase_orders (expected_delivery)
  WHERE wa_reminder_sent IS NULL AND status IN ('draft', 'sent', 'confirmed');

-- Index for overdue task alerts
CREATE INDEX IF NOT EXISTS idx_tasks_wa_overdue_alert
  ON public.tasks (due_date)
  WHERE wa_overdue_alert_sent IS NULL AND priority IN ('critical', 'high');

-- Index for contractor follow-up lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_followup
  ON public.whatsapp_messages (template_name, created_at)
  WHERE followup_sent IS NULL AND direction = 'outbound';

NOTIFY pgrst, 'reload schema';
