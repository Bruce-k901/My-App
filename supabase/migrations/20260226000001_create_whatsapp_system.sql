-- ============================================================================
-- WhatsApp Cloud API Integration
-- Tables: whatsapp_messages, whatsapp_templates, whatsapp_contacts
-- Plus: integration_connections update, storage bucket, helper functions
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update integration_connections CHECK constraint to allow 'whatsapp'
-- ---------------------------------------------------------------------------
ALTER TABLE public.integration_connections
  DROP CONSTRAINT IF EXISTS integration_connections_integration_type_check;

ALTER TABLE public.integration_connections
  ADD CONSTRAINT integration_connections_integration_type_check
  CHECK (integration_type IN (
    'label_printer', 'pos_system', 'xero', 'quickbooks', 'whatsapp', 'other'
  ));

-- ---------------------------------------------------------------------------
-- 2. whatsapp_contacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,                           -- E.164 format (+447xxx)
  wa_display_name TEXT,                                 -- Name from WhatsApp profile
  contact_type TEXT NOT NULL DEFAULT 'other'
    CHECK (contact_type IN ('supplier', 'contractor', 'staff', 'management', 'other')),
  linked_entity_type TEXT                               -- 'supplier', 'contractor', 'profile'
    CHECK (linked_entity_type IS NULL OR linked_entity_type IN ('supplier', 'contractor', 'profile')),
  linked_entity_id UUID,                                -- FK to suppliers, contractors, or profiles
  supplier_id UUID,                                    -- Logical FK to suppliers (view, not table)
  contractor_id UUID,                                  -- Logical FK to contractors (view, not table)
  opted_in BOOLEAN NOT NULL DEFAULT false,              -- Explicit consent required
  opted_in_at TIMESTAMPTZ,                              -- When consent was given
  msgly_channel_id UUID,                                -- Auto-created Msgly channel for this contact
  last_message_at TIMESTAMPTZ,                          -- Last inbound message timestamp
  service_window_expires TIMESTAMPTZ,                   -- 24hr free-text window expiry
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT whatsapp_contacts_company_phone_unique UNIQUE (company_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_company
  ON public.whatsapp_contacts (company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone
  ON public.whatsapp_contacts (phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_supplier
  ON public.whatsapp_contacts (supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_contractor
  ON public.whatsapp_contacts (contractor_id) WHERE contractor_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. whatsapp_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  meta_template_id TEXT,                                -- Meta's template ID
  name TEXT NOT NULL,                                   -- Slug: supplier_order_v1
  display_name TEXT NOT NULL,                           -- Human-readable name
  category TEXT NOT NULL DEFAULT 'utility'
    CHECK (category IN ('utility', 'marketing', 'authentication')),
  use_case TEXT NOT NULL DEFAULT 'custom'
    CHECK (use_case IN (
      'supplier_order', 'contractor_callout', 'task_reminder',
      'emergency', 'delivery_reminder', 'custom'
    )),
  language TEXT NOT NULL DEFAULT 'en_GB',
  header_type TEXT
    CHECK (header_type IS NULL OR header_type IN ('text', 'image', 'document')),
  header_text TEXT,
  body_text TEXT NOT NULL,                              -- Template body with {{1}} placeholders
  footer_text TEXT,
  buttons JSONB,                                        -- Quick reply or URL buttons
  param_schema JSONB,                                   -- [{name, source_field, description}]
  meta_status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (meta_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
  meta_rejection_reason TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,             -- true = Opsly pre-built
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_company
  ON public.whatsapp_templates (company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name
  ON public.whatsapp_templates (company_id, name);

-- ---------------------------------------------------------------------------
-- 4. whatsapp_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  direction TEXT NOT NULL
    CHECK (direction IN ('outbound', 'inbound')),
  wa_message_id TEXT UNIQUE,                            -- Meta's wamid.xxx for deduplication
  phone_number TEXT NOT NULL,                           -- Recipient/sender in E.164
  contact_name TEXT,                                    -- WhatsApp display name
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('template', 'text', 'image', 'document', 'reaction', 'audio', 'video')),
  template_name TEXT,                                   -- Which template was used (outbound)
  template_params JSONB,                                -- Parameters passed to template
  content TEXT,                                         -- Message body text
  media_url TEXT,                                       -- Supabase Storage path (NOT Meta temp URL)
  -- Message delivery status (updated by Meta webhook status events)
  -- 'queued' -> 'sent' -> 'delivered' -> 'read' (or 'failed')
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  error_code TEXT,                                      -- Meta error code if failed
  error_message TEXT,                                   -- Human-readable error
  -- Entity linking
  linked_entity_type TEXT
    CHECK (linked_entity_type IS NULL OR linked_entity_type IN (
      'purchase_order', 'callout', 'task', 'emergency', 'work_order'
    )),
  linked_entity_id UUID,
  -- Msgly bridge
  msgly_channel_id UUID,                                -- Which Msgly channel this maps to
  msgly_message_id UUID,                                -- The system message created in Msgly
  -- Audit
  triggered_by UUID,                                    -- Which Opsly user triggered the send
  -- Internal webhook processing state (independent of delivery status)
  -- 'pending' -> 'processed' (or 'failed')
  -- Tracks whether media download, Msgly bridge, etc. completed
  processing_status TEXT NOT NULL DEFAULT 'processed'
    CHECK (processing_status IN ('pending', 'processed', 'failed')),
  -- Retry queue
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company
  ON public.whatsapp_messages (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id
  ON public.whatsapp_messages (wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone
  ON public.whatsapp_messages (phone_number, company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processing
  ON public.whatsapp_messages (processing_status, created_at)
  WHERE processing_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_retry
  ON public.whatsapp_messages (next_retry_at)
  WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_entity
  ON public.whatsapp_messages (linked_entity_type, linked_entity_id)
  WHERE linked_entity_type IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. RLS Policies
-- ---------------------------------------------------------------------------

-- whatsapp_contacts
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_contacts_select"
  ON public.whatsapp_contacts FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "whatsapp_contacts_insert"
  ON public.whatsapp_contacts FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin', 'manager')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

CREATE POLICY "whatsapp_contacts_update"
  ON public.whatsapp_contacts FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin', 'manager')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

CREATE POLICY "whatsapp_contacts_delete"
  ON public.whatsapp_contacts FOR DELETE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

-- whatsapp_templates
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_templates_select"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "whatsapp_templates_insert"
  ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

CREATE POLICY "whatsapp_templates_update"
  ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

CREATE POLICY "whatsapp_templates_delete"
  ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

-- whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_messages_select"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "whatsapp_messages_insert"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "whatsapp_messages_update"
  ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin', 'manager')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Idempotent status update function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_wa_status_if_newer(
  p_wa_message_id TEXT,
  p_new_status TEXT
) RETURNS VOID AS $$
  UPDATE public.whatsapp_messages
  SET
    status = p_new_status,
    status_updated_at = NOW()
  WHERE wa_message_id = p_wa_message_id
    AND CASE status
      WHEN 'queued'     THEN 0
      WHEN 'sent'       THEN 1
      WHEN 'delivered'  THEN 2
      WHEN 'read'       THEN 3
      ELSE 99
    END < CASE p_new_status
      WHEN 'queued'     THEN 0
      WHEN 'sent'       THEN 1
      WHEN 'delivered'  THEN 2
      WHEN 'read'       THEN 3
      WHEN 'failed'     THEN 99
      ELSE -1
    END;
$$ LANGUAGE SQL;

-- ---------------------------------------------------------------------------
-- 7. Storage bucket for WhatsApp media
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('whatsapp-media', 'whatsapp-media', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can only access their company's media
CREATE POLICY "whatsapp_media_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "whatsapp_media_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
