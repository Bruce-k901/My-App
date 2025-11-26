# Rename remaining duplicate migrations
# Run this from the migrations folder

$renames = @(
    @{Old="20250206000004_update_pricing_calculation.sql"; New="20250206000010_update_pricing_calculation.sql"},
    @{Old="20250206000005_fix_task_generation_concatenation_error.sql"; New="20250206000011_fix_task_generation_concatenation_error.sql"},
    @{Old="20250207000004_update_cron_schedule_for_daily_tasks.sql"; New="20250207000010_update_cron_schedule_for_daily_tasks.sql"},
    @{Old="20250220000003_fix_profiles_rls_company_access.sql"; New="20250220000010_fix_profiles_rls_company_access.sql"},
    @{Old="20250220000004_update_channel_last_message_trigger.sql"; New="20250220000011_update_channel_last_message_trigger.sql"},
    @{Old="20250220000005_update_notification_functions_for_staff_attendance.sql"; New="20250220000012_update_notification_functions_for_staff_attendance.sql"},
    @{Old="20250220000006_setup_topics_and_pinning.sql"; New="20250220000013_setup_topics_and_pinning.sql"},
    @{Old="20250220000007_fix_task_templates_rls_for_client_side.sql"; New="20250220000014_fix_task_templates_rls_for_client_side.sql"},
    @{Old="20250220000008_fix_tasks_insert_policy.sql"; New="20250220000015_fix_tasks_insert_policy.sql"},
    @{Old="20250220000009_seed_risk_assessments.sql"; New="20250220000016_seed_risk_assessments.sql"},
    @{Old="20250221000004_fix_pro_plan_pricing.sql"; New="20250221000010_fix_pro_plan_pricing.sql"},
    @{Old="20250221000005_update_monthly_amount_calculation.sql"; New="20250221000011_update_monthly_amount_calculation.sql"},
    @{Old="20250221000006_update_checklist_tasks_table.sql"; New="20250221000012_update_checklist_tasks_table.sql"},
    @{Old="20250221000007_update_attendance_rpc_functions.sql"; New="20250221000013_update_attendance_rpc_functions.sql"}
)

foreach ($rename in $renames) {
    if (Test-Path $rename.Old) {
        if (Test-Path $rename.New) {
            Write-Host "⚠️  SKIP: $($rename.New) already exists" -ForegroundColor Yellow
        } else {
            Rename-Item $rename.Old $rename.New
            Write-Host "✅ Renamed: $($rename.Old) -> $($rename.New)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  NOT FOUND: $($rename.Old)" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Done! All duplicates renamed." -ForegroundColor Green

