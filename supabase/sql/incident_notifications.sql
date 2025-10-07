-- Queue table and trigger to notify on high severity incidents

CREATE TABLE IF NOT EXISTS public.incident_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending/sent/failed
  payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_incident_notifications_status ON public.incident_notifications (status);
CREATE INDEX IF NOT EXISTS idx_incident_notifications_created ON public.incident_notifications (created_at DESC);

ALTER TABLE public.incident_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role should read/write this queue; omit user policies.

-- Function to enqueue on high severity incident insert
CREATE OR REPLACE FUNCTION public.enqueue_high_severity_incident()
RETURNS trigger AS $$
BEGIN
  IF NEW.severity = 'high' THEN
    INSERT INTO public.incident_notifications (incident_id, payload)
    VALUES (
      NEW.id,
      jsonb_build_object(
        'type', NEW.type,
        'description', NEW.description,
        'severity', NEW.severity,
        'site_id', NEW.site_id,
        'company_id', NEW.company_id,
        'created_at', NEW.created_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incidents_enqueue ON public.incidents;
CREATE TRIGGER trg_incidents_enqueue
AFTER INSERT ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.enqueue_high_severity_incident();