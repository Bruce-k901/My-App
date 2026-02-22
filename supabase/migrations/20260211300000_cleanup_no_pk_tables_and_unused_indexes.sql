-- ============================================================================
-- Migration: Clean up no_primary_key and unused_index linter warnings
-- Description:
--   1. Drops old backup/migration tables that have no primary key
--   2. Drops unused indexes that add write overhead with zero read benefit
--
-- Note: unused_index detection is based on pg_stat since last stats reset.
--       These indexes have never been used in the current environment.
-- ============================================================================

-- ============================================================================
-- PART 1: Drop backup/migration tables with no primary key
-- These are leftover artifacts from past migrations, not used by the app.
-- ============================================================================

-- Drop the entire backup_identity_migration schema (all tables within it)
DROP SCHEMA IF EXISTS backup_identity_migration CASCADE;

-- Drop public backup/seed tables
DROP TABLE IF EXISTS public.messages_backup CASCADE;
DROP TABLE IF EXISTS public.companies_backup CASCADE;
DROP TABLE IF EXISTS public.conversations_backup CASCADE;
DROP TABLE IF EXISTS public.task_template_seed CASCADE;

-- ============================================================================
-- PART 2: Drop unused indexes
-- These have never been used and only add overhead on INSERT/UPDATE/DELETE.
-- ============================================================================

-- User certificates
DROP INDEX IF EXISTS public.idx_user_certificates_expiry_date;

-- Conversations (old messaging system - many unused indexes)
DROP INDEX IF EXISTS public.idx_conversations_topic_category;
DROP INDEX IF EXISTS public.idx_conversations_context;
DROP INDEX IF EXISTS public.idx_conversations_pinned;
DROP INDEX IF EXISTS public.idx_conversations_last_message_at;
DROP INDEX IF EXISTS public.idx_conversations_created_by;

-- Sites redundant
DROP INDEX IF EXISTS public.idx_sites_company;

-- Messages (old messaging system)
DROP INDEX IF EXISTS public.idx_messages_is_task;
DROP INDEX IF EXISTS public.idx_messages_task_id;
DROP INDEX IF EXISTS public.idx_messages_conversation_id;
DROP INDEX IF EXISTS public.idx_messages_type;

-- Staff
DROP INDEX IF EXISTS public.idx_staff_company;
DROP INDEX IF EXISTS public.idx_staff_company_dept;

-- Tasks
DROP INDEX IF EXISTS public.idx_tasks_status;
DROP INDEX IF EXISTS public.idx_tasks_created_at;
DROP INDEX IF EXISTS public.idx_tasks_company_dept;

-- Planly
DROP INDEX IF EXISTS public.idx_planly_orders_delivery_status;
DROP INDEX IF EXISTS public.idx_planly_order_lines_order_product;
DROP INDEX IF EXISTS public.idx_planly_products_site_bake_active;
DROP INDEX IF EXISTS public.idx_planly_customers_needs_delivery;

-- Ingredients / Library items
DROP INDEX IF EXISTS public.idx_ingredients_company_category;
DROP INDEX IF EXISTS public.idx_ingredients_search;
DROP INDEX IF EXISTS public.idx_ppe_library_category;
DROP INDEX IF EXISTS public.idx_ppe_search;
DROP INDEX IF EXISTS public.idx_chemicals_library_product_name;
DROP INDEX IF EXISTS public.idx_chemicals_library_use_case;
DROP INDEX IF EXISTS public.idx_chemicals_search;
DROP INDEX IF EXISTS public.idx_drinks_search;
DROP INDEX IF EXISTS public.idx_drinks_library_item_name;
DROP INDEX IF EXISTS public.idx_disposables_search;
DROP INDEX IF EXISTS public.idx_disposables_library_category;
DROP INDEX IF EXISTS public.idx_glassware_search;
DROP INDEX IF EXISTS public.idx_packaging_search;
DROP INDEX IF EXISTS public.idx_serving_equipment_search;
DROP INDEX IF EXISTS public.idx_equipment_search;

-- Task template categories
DROP INDEX IF EXISTS public.idx_ttc_category;

-- Conversation participants
DROP INDEX IF EXISTS public.idx_participants_conversation_id;

-- Training courses
DROP INDEX IF EXISTS public.idx_training_courses_company;
DROP INDEX IF EXISTS public.idx_training_courses_mandatory;

-- Memberships
DROP INDEX IF EXISTS public.memberships_auth_role_idx;

-- Order book customers
DROP INDEX IF EXISTS public.idx_order_book_customers_company;

-- Task schedules
DROP INDEX IF EXISTS public.task_schedules_weekdays_gin;

-- Candidates
DROP INDEX IF EXISTS public.idx_candidates_status;

-- Areas
DROP INDEX IF EXISTS public.idx_areas_region_id;
DROP INDEX IF EXISTS public.idx_areas_company_id;

-- Sites
DROP INDEX IF EXISTS public.idx_sites_area_id;

-- Approval workflows
DROP INDEX IF EXISTS public.idx_approval_workflows_company_id;

-- Rotas
DROP INDEX IF EXISTS public.idx_rotas_published_by;
DROP INDEX IF EXISTS public.idx_rotas_submitted_for_approval_by;

-- Scoring scales
DROP INDEX IF EXISTS public.idx_scoring_scales_created_by;

-- Service reports
DROP INDEX IF EXISTS public.idx_service_reports_company_id;
DROP INDEX IF EXISTS public.idx_service_reports_contractor_id;
DROP INDEX IF EXISTS public.idx_service_reports_created_by;
DROP INDEX IF EXISTS public.idx_service_reports_site_id;

-- User site access
DROP INDEX IF EXISTS public.idx_user_site_access_auth_user;
DROP INDEX IF EXISTS public.idx_user_site_access_auth_site;

-- COSHH
DROP INDEX IF EXISTS public.idx_coshh_chemical;
DROP INDEX IF EXISTS public.idx_coshh_expiry;
DROP INDEX IF EXISTS public.idx_coshh_product_name;

-- Shift templates
DROP INDEX IF EXISTS public.idx_shift_templates_site_id;

-- Notifications
DROP INDEX IF EXISTS public.idx_notifications_message_mention;

-- Site applied templates
DROP INDEX IF EXISTS public.idx_site_applied_templates_checklist_template_id;

-- Site checklists
DROP INDEX IF EXISTS public.idx_site_checklists_company_id;

-- SOP entries
DROP INDEX IF EXISTS public.idx_sop_entries_category;
DROP INDEX IF EXISTS public.idx_sop_entries_ref_code;
