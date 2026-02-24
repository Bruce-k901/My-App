-- ============================================================================
-- Seed system WhatsApp templates for all companies.
-- These are Opsly-provided templates that each company submits to Meta.
-- ============================================================================

-- supplier_order_v1 — sent when a PO is created and "Send via WhatsApp" is clicked
INSERT INTO public.whatsapp_templates (
  company_id, name, display_name, category, use_case, language,
  header_type, header_text, body_text, footer_text,
  param_schema, meta_status, is_system
)
SELECT
  c.id,
  'supplier_order_v1',
  'Supplier Purchase Order',
  'utility',
  'supplier_order',
  'en_GB',
  'text',
  'OPSLY - Purchase Order',
  'Hi {{1}}, new order from {{2}}:

PO: {{3}}
Items: {{4}}
Delivery: {{5}}

Please confirm or reply with any issues.',
  'Sent via Opsly',
  '[
    {"name": "contact_name", "source_field": "supplier.contact_name", "description": "Supplier contact name"},
    {"name": "site_name", "source_field": "site.name", "description": "Site placing the order"},
    {"name": "po_number", "source_field": "purchase_order.order_number", "description": "Purchase order number"},
    {"name": "items", "source_field": "formatted_line_items", "description": "Formatted item list (first 5 + count)"},
    {"name": "delivery_date", "source_field": "purchase_order.expected_delivery_date", "description": "Expected delivery date"}
  ]'::jsonb,
  'DRAFT',
  true
FROM public.companies c
ON CONFLICT DO NOTHING;

-- supplier_order_update_v1 — sent when a PO is amended after initial send
INSERT INTO public.whatsapp_templates (
  company_id, name, display_name, category, use_case, language,
  header_type, header_text, body_text, footer_text,
  param_schema, meta_status, is_system
)
SELECT
  c.id,
  'supplier_order_update_v1',
  'Order Amendment',
  'utility',
  'supplier_order',
  'en_GB',
  'text',
  'OPSLY - Order Updated',
  'Hi {{1}}, order {{2}} from {{3}} has been updated.

Updated items: {{4}}
New total: {{5}}

Please review and confirm the changes.',
  'Sent via Opsly',
  '[
    {"name": "contact_name", "source_field": "supplier.contact_name", "description": "Supplier contact name"},
    {"name": "po_number", "source_field": "purchase_order.order_number", "description": "Purchase order number"},
    {"name": "site_name", "source_field": "site.name", "description": "Site placing the order"},
    {"name": "items", "source_field": "formatted_line_items", "description": "Updated item list"},
    {"name": "total", "source_field": "purchase_order.total", "description": "New order total"}
  ]'::jsonb,
  'DRAFT',
  true
FROM public.companies c
ON CONFLICT DO NOTHING;

-- delivery_reminder_v1 — sent day before expected delivery
INSERT INTO public.whatsapp_templates (
  company_id, name, display_name, category, use_case, language,
  header_type, header_text, body_text, footer_text,
  param_schema, meta_status, is_system
)
SELECT
  c.id,
  'delivery_reminder_v1',
  'Delivery Reminder',
  'utility',
  'delivery_reminder',
  'en_GB',
  'text',
  'OPSLY - Delivery Reminder',
  'Hi {{1}}, friendly reminder that order {{2}} is expected for delivery tomorrow ({{3}}) at {{4}}.

Items: {{5}}

Please confirm delivery is on track.',
  'Sent via Opsly',
  '[
    {"name": "contact_name", "source_field": "supplier.contact_name", "description": "Supplier contact name"},
    {"name": "po_number", "source_field": "purchase_order.order_number", "description": "Purchase order number"},
    {"name": "delivery_date", "source_field": "purchase_order.expected_delivery_date", "description": "Expected delivery date"},
    {"name": "site_name", "source_field": "site.name", "description": "Delivery site name"},
    {"name": "items", "source_field": "formatted_line_items", "description": "Item list"}
  ]'::jsonb,
  'DRAFT',
  true
FROM public.companies c
ON CONFLICT DO NOTHING;

-- contractor_callout_v1 — emergency or scheduled contractor callout
INSERT INTO public.whatsapp_templates (
  company_id, name, display_name, category, use_case, language,
  header_type, header_text, body_text, footer_text,
  param_schema, meta_status, is_system
)
SELECT
  c.id,
  'contractor_callout_v1',
  'Contractor Callout',
  'utility',
  'contractor_callout',
  'en_GB',
  'text',
  'OPSLY - Callout Request',
  'Hi {{1}}, callout request from {{2}}:

Issue: {{3}}
Priority: {{4}}
Location: {{5}}
Contact: {{6}}

Can you attend? Reply YES to confirm or suggest alternative time.',
  'Sent via Opsly',
  '[
    {"name": "contact_name", "source_field": "contractor.contact_name", "description": "Contractor contact name"},
    {"name": "site_name", "source_field": "site.name", "description": "Site requesting callout"},
    {"name": "issue", "source_field": "callout.description", "description": "Issue description"},
    {"name": "priority", "source_field": "callout.priority", "description": "Priority level"},
    {"name": "location", "source_field": "callout.location", "description": "Specific location within site"},
    {"name": "site_contact", "source_field": "site.contact_phone", "description": "Site contact for the contractor"}
  ]'::jsonb,
  'DRAFT',
  true
FROM public.companies c
ON CONFLICT DO NOTHING;

-- emergency_alert_v1 — critical incident alert
INSERT INTO public.whatsapp_templates (
  company_id, name, display_name, category, use_case, language,
  header_type, header_text, body_text, footer_text,
  param_schema, meta_status, is_system
)
SELECT
  c.id,
  'emergency_alert_v1',
  'Emergency Alert',
  'utility',
  'emergency',
  'en_GB',
  'text',
  'URGENT - {{1}}',
  'Emergency at {{2}}:

{{3}}

Action required: {{4}}
Raised by: {{5}} at {{6}}

Please acknowledge this message immediately.',
  'Sent via Opsly',
  '[
    {"name": "alert_type", "source_field": "incident.type", "description": "Type of emergency"},
    {"name": "site_name", "source_field": "site.name", "description": "Site where emergency occurred"},
    {"name": "description", "source_field": "incident.description", "description": "Emergency details"},
    {"name": "action_required", "source_field": "incident.action_required", "description": "Required action"},
    {"name": "raised_by", "source_field": "profile.full_name", "description": "Person who raised the alert"},
    {"name": "time", "source_field": "incident.created_at", "description": "Time the alert was raised"}
  ]'::jsonb,
  'DRAFT',
  true
FROM public.companies c
ON CONFLICT DO NOTHING;

-- task_overdue_v1 — overdue critical task reminder
INSERT INTO public.whatsapp_templates (
  company_id, name, display_name, category, use_case, language,
  header_type, header_text, body_text, footer_text,
  param_schema, meta_status, is_system
)
SELECT
  c.id,
  'task_overdue_v1',
  'Overdue Task Reminder',
  'utility',
  'task_reminder',
  'en_GB',
  'text',
  'OPSLY - Overdue Task',
  'Hi {{1}}, the following task is overdue:

Task: {{2}}
Site: {{3}}
Due: {{4}}
Assigned to: {{5}}

Please review in Opsly or reply with an update.',
  'Sent via Opsly',
  '[
    {"name": "manager_name", "source_field": "profile.full_name", "description": "Manager receiving the reminder"},
    {"name": "task_title", "source_field": "task.title", "description": "Task title"},
    {"name": "site_name", "source_field": "site.name", "description": "Site the task belongs to"},
    {"name": "due_date", "source_field": "task.due_date", "description": "Task due date"},
    {"name": "assigned_to", "source_field": "assignee.full_name", "description": "Person assigned to the task"}
  ]'::jsonb,
  'DRAFT',
  true
FROM public.companies c
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
