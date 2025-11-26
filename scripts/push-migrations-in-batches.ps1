# Push Migrations in Smaller Batches
# This helps avoid database connection timeouts

$ErrorActionPreference = "Stop"

Write-Host "📦 Pushing Migrations in Batches" -ForegroundColor Cyan
Write-Host ""

# Get all pending migrations
$pendingMigrations = @(
    "20250206000004_add_unique_constraint_prevent_duplicates.sql",
    "20250206000004_update_pricing_calculation.sql",
    "20250206000005_create_deduplicated_tasks_view.sql",
    "20250206000005_fix_task_generation_concatenation_error.sql",
    "20250206000006_test_cron_11am_bst.sql",
    "20250207000001_add_training_records_rls.sql",
    "20250207000002_add_training_compliance_task.sql",
    "20250207000004_update_cron_schedule_for_daily_tasks.sql",
    "20250207000005_fix_single_daily_cron_comprehensive.sql",
    "20250220000000_add_topics_to_conversations.sql",
    "20250220000001_create_staff_attendance.sql",
    "20250220000002_add_pinned_to_messaging_channels.sql",
    "20250220000003_drop_old_attendance_logs_table.sql",
    "20250220000003_fix_profiles_rls_company_access.sql",
    "20250220000004_add_topic_to_messaging_messages.sql",
    "20250220000004_update_channel_last_message_trigger.sql",
    "20250220000005_fix_remaining_attendance_references.sql",
    "20250220000005_update_notification_functions_for_staff_attendance.sql",
    "20250220000006_create_generic_task_templates.sql",
    "20250220000006_setup_topics_and_pinning.sql",
    "20250220000007_fix_task_templates_rls_for_client_side.sql",
    "20250220000008_fix_tasks_insert_policy.sql",
    "20250220000009_seed_risk_assessments.sql",
    "20250221000001_archive_and_clean_tasks.sql",
    "20250221000002_create_site_checklists_table.sql",
    "20250221000003_add_per_site_quantities.sql",
    "20250221000004_add_asset_type_to_temperature_templates.sql",
    "20250221000004_fix_pro_plan_pricing.sql",
    "20250221000005_update_monthly_amount_calculation.sql",
    "20250221000006_update_checklist_tasks_table.sql",
    "20250221000007_update_attendance_rpc_functions.sql"
)

Write-Host "Found $($pendingMigrations.Count) migrations to apply" -ForegroundColor Yellow
Write-Host ""

# Try pushing all at once first
Write-Host "Attempting to push all migrations..." -ForegroundColor Cyan
Write-Host ""

$result = supabase db push --include-all 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All migrations applied successfully!" -ForegroundColor Green
    exit 0
}

Write-Host "❌ Batch push failed. Error:" -ForegroundColor Red
Write-Host $result -ForegroundColor Red
Write-Host ""
Write-Host "💡 Try these alternatives:" -ForegroundColor Yellow
Write-Host "1. Check database connection: supabase projects list" -ForegroundColor White
Write-Host "2. Try with debug: supabase db push --include-all --debug" -ForegroundColor White
Write-Host "3. Apply migrations manually via SQL Editor" -ForegroundColor White
Write-Host ""

