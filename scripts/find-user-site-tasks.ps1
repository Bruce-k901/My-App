# Find user's home site and check if tasks exist for it
param(
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$ServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

$headers = @{
    "Authorization" = "Bearer $ServiceKey"
    "apikey" = $ServiceKey
    "Content-Type" = "application/json"
}

$today = (Get-Date).ToString("yyyy-MM-dd")

Write-Host "Diagnostic: Finding tasks for users home site" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Gray

# First, get all tasks created today and their sites
Write-Host "`n📋 All tasks created today:" -ForegroundColor Yellow
$allTasksUrl = "$SupabaseUrl/rest/v1/checklist_tasks?due_date=eq.$today" + '&select=id,site_id,custom_name,company_id' + '&order=created_at.desc'
$allTasks = Invoke-RestMethod -Uri $allTasksUrl -Method GET -Headers $headers

Write-Host "Total tasks: $($allTasks.Count)" -ForegroundColor Cyan

# Group by site
$bySite = $allTasks | Where-Object { $_.site_id } | Group-Object -Property site_id
$bySite | ForEach-Object {
    Write-Host "`n  Site ID: $($_.Name)" -ForegroundColor Green
    Write-Host "    Tasks: $($_.Count)" -ForegroundColor Gray
    $_.Group | ForEach-Object {
        Write-Host "      - $($_.custom_name)" -ForegroundColor White
    }
}

$tasksWithoutSite = $allTasks | Where-Object { -not $_.site_id }
if ($tasksWithoutSite.Count -gt 0) {
    Write-Host "`n  (No site_id) - $($tasksWithoutSite.Count) tasks" -ForegroundColor Yellow
    $tasksWithoutSite | ForEach-Object {
        Write-Host "      - $($_.custom_name)" -ForegroundColor White
    }
}

# Get all sites for the company
$companyId = $allTasks[0].company_id
Write-Host "`n`n🏢 Company ID: $companyId" -ForegroundColor Cyan

$sitesUrl = "$SupabaseUrl/rest/v1/sites?company_id=eq.$companyId" + '&select=id,name' + '&order=name'
$sites = Invoke-RestMethod -Uri $sitesUrl -Method GET -Headers $headers

Write-Host "`n📍 Sites in company:" -ForegroundColor Yellow
$sites | ForEach-Object {
    $siteTasks = ($allTasks | Where-Object { $_.site_id -eq $_.id }).Count
    $status = if ($siteTasks -gt 0) { "✅" } else { "❌" }
    Write-Host "  $status $($_.name) (ID: $($_.id)) - $siteTasks tasks" -ForegroundColor $(if ($siteTasks -gt 0) { "Green" } else { "Red" })
}

Write-Host "`n`n💡 Recommendation:" -ForegroundColor Cyan
Write-Host "If your home site shows 0 tasks, the edge function may not have created tasks for that site because:" -ForegroundColor Yellow
Write-Host "  1. No assets/PPMs are assigned to that site" -ForegroundColor Gray
Write-Host "  2. No site checklists are configured for that site" -ForegroundColor Gray
Write-Host "  3. No calendar entries exist for that site" -ForegroundColor Gray
Write-Host "  4. The site does not have active templates assigned" -ForegroundColor Gray

