# Assign existing tasks to site GM
param(
    [string]$SiteId = "1d5d6f99-72cc-4335-946d-13ff8f0b0419",
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$ServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

$headers = @{
    "Authorization" = "Bearer $ServiceKey"
    "apikey" = $ServiceKey
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$today = (Get-Date).ToString("yyyy-MM-dd")

Write-Host "Assigning tasks for site: $SiteId" -ForegroundColor Cyan

# Get site GM
$siteUrl = "$SupabaseUrl/rest/v1/sites?id=eq.$SiteId" + '&select=id,gm_user_id'
$site = Invoke-RestMethod -Uri $siteUrl -Method GET -Headers $headers

if ($site.Count -eq 0) {
    Write-Host "Site not found" -ForegroundColor Red
    exit 1
}

$gmUserId = $site[0].gm_user_id

if (-not $gmUserId) {
    Write-Host "Site has no GM assigned. Cannot assign tasks." -ForegroundColor Yellow
    exit 1
}

Write-Host "Site GM User ID: $gmUserId" -ForegroundColor Green

# Get unassigned tasks for today
$tasksUrl = "$SupabaseUrl/rest/v1/checklist_tasks?site_id=eq.$SiteId" + '&due_date=eq.' + $today + '&assigned_to_user_id=is.null' + '&select=id,custom_name'
$unassignedTasks = Invoke-RestMethod -Uri $tasksUrl -Method GET -Headers $headers

Write-Host "`nFound $($unassignedTasks.Count) unassigned tasks" -ForegroundColor Cyan

if ($unassignedTasks.Count -eq 0) {
    Write-Host "No tasks to assign" -ForegroundColor Green
    exit 0
}

# Update each task
$updated = 0
foreach ($task in $unassignedTasks) {
    $updateUrl = "$SupabaseUrl/rest/v1/checklist_tasks?id=eq.$($task.id)"
    $updateBody = @{
        assigned_to_user_id = $gmUserId
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $updateBody
        $updated++
        Write-Host "  ✅ Assigned: $($task.custom_name)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed: $($task.custom_name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Updated $updated tasks" -ForegroundColor Green


