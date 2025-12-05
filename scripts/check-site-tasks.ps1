# Check tasks for a specific site
param(
    [string]$SiteId = "",
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$ServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

$headers = @{
    "Authorization" = "Bearer $ServiceKey"
    "apikey" = $ServiceKey
    "Content-Type" = "application/json"
}

$today = (Get-Date).ToString("yyyy-MM-dd")

if ($SiteId) {
    Write-Host "Checking tasks for site: $SiteId" -ForegroundColor Cyan
    $tasksUrl = "$SupabaseUrl/rest/v1/checklist_tasks?due_date=eq.$today&site_id=eq.$SiteId&select=id,site_id,custom_name,status,daypart,due_time,template_id,company_id&order=created_at.desc"
} else {
    Write-Host "Checking all tasks for today (no site filter)" -ForegroundColor Cyan
    $tasksUrl = "$SupabaseUrl/rest/v1/checklist_tasks?due_date=eq.$today&select=id,site_id,custom_name,status,daypart,due_time,template_id,company_id&order=created_at.desc"
}

try {
    $tasks = Invoke-RestMethod -Uri $tasksUrl -Method GET -Headers $headers
    
    Write-Host "`nFound $($tasks.Count) tasks for today" -ForegroundColor Cyan
    
    if ($tasks.Count -eq 0) {
        Write-Host "`n⚠️  No tasks found for this site/date combination" -ForegroundColor Yellow
        Write-Host "`nThis could mean:" -ForegroundColor Yellow
        Write-Host "  1. No tasks were generated for this site" -ForegroundColor Gray
        Write-Host "  2. Tasks were created for different sites" -ForegroundColor Gray
        Write-Host "  3. The site_id doesn't match" -ForegroundColor Gray
    } else {
        Write-Host "`nTasks:" -ForegroundColor Green
        $tasks | ForEach-Object {
            Write-Host "  - $($_.custom_name) (Site: $($_.site_id), Status: $($_.status))" -ForegroundColor White
        }
    }
    
    # Also check what sites have tasks
    Write-Host "`n`nAll sites with tasks today:" -ForegroundColor Cyan
    $allTasksUrl = "$SupabaseUrl/rest/v1/checklist_tasks?due_date=eq.$today&select=site_id&order=created_at.desc"
    $allTasks = Invoke-RestMethod -Uri $allTasksUrl -Method GET -Headers $headers
    $sitesWithTasks = $allTasks | Where-Object { $_.site_id } | Group-Object -Property site_id
    $sitesWithTasks | ForEach-Object {
        Write-Host "  Site ID: $($_.Name) - $($_.Count) tasks" -ForegroundColor Yellow
    }
    
    $tasksWithoutSite = ($allTasks | Where-Object { -not $_.site_id }).Count
    if ($tasksWithoutSite -gt 0) {
        Write-Host "  (No site_id) - $tasksWithoutSite tasks" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}


