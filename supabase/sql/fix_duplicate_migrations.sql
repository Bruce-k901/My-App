-- ============================================================================
-- FIX DUPLICATE MIGRATION ERROR
-- ============================================================================
-- The repair script added migrations to the history, but the CLI is trying
-- to apply them again. This script removes the duplicate entries so the CLI
-- can properly apply the migrations.
-- ============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Run this in Supabase SQL Editor
-- 2. Then run: supabase db push --include-all
-- ============================================================================

-- Remove ALL migrations with duplicate timestamps
-- The issue is that multiple migration files share the same timestamp,
-- but the migration history table uses timestamp as primary key (one per timestamp).
-- We need to remove ALL instances so the CLI can apply them properly.

-- Remove all duplicate-timestamp migrations (there are 2 files per timestamp)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN (
    '20250115000000',  -- fix_compliance_score_function AND seed_food_labelling_dating_audit_template
    '20250206000001',  -- add_training_certificates_to_profiles AND update_pricing_calculation
    '20250206000002',  -- fix_cron_task_source AND fix_task_generation_concatenation_error
    '20250206000003',  -- add_compliance_scanning_cron AND add_unique_constraint_prevent_duplicates
    '20250206000004',  -- create_deduplicated_tasks_view AND test_cron_11am_bst
    '20250207000001',  -- add_training_records_rls AND update_cron_schedule_for_daily_tasks
    '20250207000002',  -- add_training_compliance_task AND fix_single_daily_cron_comprehensive
    '20250220000000',  -- add_topics_to_conversations AND create_staff_attendance
    '20250220000001',  -- fix_profiles_rls_company_access AND update_channel_last_message_trigger
    '20250220000002',  -- add_pinned_to_messaging_channels AND update_notification_functions_for_staff_attendance
    '20250220000003',  -- drop_old_attendance_logs_table AND setup_topics_and_pinning
    '20250220000004',  -- add_topic_to_messaging_messages AND fix_remaining_attendance_references
    '20250220000005',  -- fix_task_templates_rls_for_client_side AND fix_tasks_insert_policy
    '20250220000006',  -- create_generic_task_templates AND fix_notification_system_functions
    '20250221000001',  -- archive_and_clean_tasks AND fix_pro_plan_pricing
    '20250221000002',  -- create_site_checklists_table AND update_monthly_amount_calculation
    '20250221000003',  -- add_per_site_quantities AND update_checklist_tasks_table
    '20250221000004'   -- add_asset_type_to_temperature_templates AND fix_addon_rls_and_pricing
);

-- Verify the removal
SELECT 
    'Removed migrations. Remaining count:' as info,
    COUNT(*) as remaining_migrations
FROM supabase_migrations.schema_migrations;

-- Show what's left
SELECT 
    version,
    name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

