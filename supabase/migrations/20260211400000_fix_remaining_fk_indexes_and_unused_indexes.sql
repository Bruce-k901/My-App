-- ============================================================================
-- Migration: Fix remaining unindexed FKs + drop unused indexes (round 2)
-- The previous cleanup dropped some indexes that were covering FK columns.
-- This re-creates those FK indexes and drops remaining unused indexes.
-- ============================================================================

-- ============================================================================
-- PART 1: Create indexes for unindexed foreign keys
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_created_by_profile_id ON public.conversations (created_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_coshh_data_sheets_chemical_id ON public.coshh_data_sheets (chemical_id);
CREATE INDEX IF NOT EXISTS idx_memberships_auth_user_id ON public.memberships (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON public.messages (task_id);
CREATE INDEX IF NOT EXISTS idx_order_book_customers_company_id ON public.order_book_customers (company_id);
CREATE INDEX IF NOT EXISTS idx_rotas_published_by ON public.rotas (published_by);
CREATE INDEX IF NOT EXISTS idx_rotas_submitted_for_approval_by ON public.rotas (submitted_for_approval_by);
CREATE INDEX IF NOT EXISTS idx_scoring_scales_created_by ON public.scoring_scales (created_by);
CREATE INDEX IF NOT EXISTS idx_service_reports_company_id ON public.service_reports (company_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_contractor_id ON public.service_reports (contractor_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_created_by ON public.service_reports (created_by);
CREATE INDEX IF NOT EXISTS idx_service_reports_site_id ON public.service_reports (site_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_site_id ON public.shift_templates (site_id);
CREATE INDEX IF NOT EXISTS idx_site_applied_templates_checklist_template_id ON public.site_applied_templates (checklist_template_id);
CREATE INDEX IF NOT EXISTS idx_site_checklists_company_id ON public.site_checklists (company_id);
CREATE INDEX IF NOT EXISTS idx_staff_company_department_id ON public.staff (company_department_id);
CREATE INDEX IF NOT EXISTS idx_task_template_categories_category_id ON public.task_template_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_department_id ON public.tasks (company_department_id);

-- ============================================================================
-- PART 2: Drop remaining unused indexes
-- These do NOT cover any foreign key columns.
-- ============================================================================

-- Timesheets
DROP INDEX IF EXISTS public.idx_timesheets_company;
DROP INDEX IF EXISTS public.idx_timesheets_period;
DROP INDEX IF EXISTS public.idx_timesheets_status;
DROP INDEX IF EXISTS public.idx_timesheets_approval;

-- Risk assessments
DROP INDEX IF EXISTS public.idx_risk_assessments_site;
DROP INDEX IF EXISTS public.idx_risk_assessments_template;
DROP INDEX IF EXISTS public.idx_risk_assessments_risk_level;

-- Glassware library
DROP INDEX IF EXISTS public.idx_glassware_company_id;
DROP INDEX IF EXISTS public.idx_glassware_category;

-- Ingredients library
DROP INDEX IF EXISTS public.idx_ingredients_library_linked_sop_id;

-- Packaging library
DROP INDEX IF EXISTS public.idx_packaging_category;

-- Message reads/reactions/mentions
DROP INDEX IF EXISTS public.idx_message_reads_read_at;
DROP INDEX IF EXISTS public.idx_message_reactions_message_id;
DROP INDEX IF EXISTS public.idx_message_mentions_user_id;

-- Equipment library
DROP INDEX IF EXISTS public.idx_equipment_library_category;
DROP INDEX IF EXISTS public.idx_equipment_library_colour_code;

-- Contractors
DROP INDEX IF EXISTS public.contractors_name_lower_idx;

-- Messaging channels
DROP INDEX IF EXISTS public.idx_messaging_channels_topic;
DROP INDEX IF EXISTS public.idx_messaging_channels_topic_category;
DROP INDEX IF EXISTS public.idx_messaging_channels_entity;
DROP INDEX IF EXISTS public.idx_messaging_channels_active;

-- Applications
DROP INDEX IF EXISTS public.idx_applications_company;
DROP INDEX IF EXISTS public.idx_applications_status;

-- Company subscriptions
DROP INDEX IF EXISTS public.idx_company_subscriptions_status;
DROP INDEX IF EXISTS public.idx_company_subscriptions_trial_ends_at;

-- Invoices
DROP INDEX IF EXISTS public.idx_invoices_subscription_id;
DROP INDEX IF EXISTS public.idx_invoices_status;
DROP INDEX IF EXISTS public.idx_invoices_due_date;

-- Callouts
DROP INDEX IF EXISTS public.idx_callouts_contractor_id;
DROP INDEX IF EXISTS public.idx_callouts_callout_type;

-- Serving equipment
DROP INDEX IF EXISTS public.idx_serving_equipment_category;

-- Data export requests
DROP INDEX IF EXISTS public.idx_data_export_requests_status;

-- Site checklists (created_by is not an FK column)
DROP INDEX IF EXISTS public.idx_site_checklists_created_by;

-- Site compliance score
DROP INDEX IF EXISTS public.idx_site_compliance_score_tenant_id;

-- Site day parts
DROP INDEX IF EXISTS public.idx_site_day_parts_company_id;

-- Tasks
DROP INDEX IF EXISTS public.idx_tasks_archived;

-- Stockly schema
DROP INDEX IF EXISTS stockly.idx_stockly_categories_company;
DROP INDEX IF EXISTS stockly.idx_stockly_storage_areas_company;
DROP INDEX IF EXISTS stockly.idx_stockly_items_category;
DROP INDEX IF EXISTS stockly.idx_stockly_levels_item;
DROP INDEX IF EXISTS stockly.idx_stockly_variants_item;
DROP INDEX IF EXISTS stockly.idx_supplier_delivery_areas_supplier;
DROP INDEX IF EXISTS stockly.idx_stockly_wastage_company;
DROP INDEX IF EXISTS stockly.idx_stockly_wastage_item;
DROP INDEX IF EXISTS stockly.idx_stock_movements_ref;
DROP INDEX IF EXISTS stockly.idx_stock_items_base_unit;
DROP INDEX IF EXISTS stockly.idx_deliveries_po;
