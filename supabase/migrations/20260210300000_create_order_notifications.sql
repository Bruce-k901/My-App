-- Create order notifications table to track notifications sent to customers
CREATE TABLE IF NOT EXISTS public.planly_order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.planly_customers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.planly_orders(id) ON DELETE CASCADE,
  standing_order_id UUID REFERENCES public.planly_standing_orders(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL DEFAULT 'order_generated', -- 'order_generated', 'order_confirmed', 'order_reminder'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_via TEXT NOT NULL DEFAULT 'email', -- 'email', 'in_app', 'sms'
  sent_to TEXT, -- email address or phone number
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_notifications_customer ON public.planly_order_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_order ON public.planly_order_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_standing_order ON public.planly_order_notifications(standing_order_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_status ON public.planly_order_notifications(status);
CREATE INDEX IF NOT EXISTS idx_order_notifications_sent_at ON public.planly_order_notifications(sent_at DESC);

-- RLS Policies
ALTER TABLE public.planly_order_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own customer's notifications
CREATE POLICY "Users can view their customer notifications"
  ON public.planly_order_notifications
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.planly_customers
      WHERE site_id IN (
        SELECT site_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON public.planly_order_notifications
  FOR INSERT
  WITH CHECK (true);

-- Service role can update notification status
CREATE POLICY "Service role can update notifications"
  ON public.planly_order_notifications
  FOR UPDATE
  USING (true);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.planly_customer_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.planly_customers(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_auto_generation BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_delivery_day BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_notification_time TIME DEFAULT '08:00:00', -- Time of day to send notifications
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for preferences
ALTER TABLE public.planly_customer_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their customer notification preferences"
  ON public.planly_customer_notification_preferences
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.planly_customers
      WHERE site_id IN (
        SELECT site_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their customer notification preferences"
  ON public.planly_customer_notification_preferences
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM public.planly_customers
      WHERE site_id IN (
        SELECT site_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Comments
COMMENT ON TABLE public.planly_order_notifications IS 'Tracks notifications sent to customers about their orders';
COMMENT ON TABLE public.planly_customer_notification_preferences IS 'Customer preferences for order notifications';
