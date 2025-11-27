# Diagnostic script to check what tasks were created today
param(
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$ServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

if (-not $SupabaseUrl -or -not $ServiceKey) {
    Write-Host "Error: Environment variables not set" -ForegroundColor Red
    exit 1
}

# Import Supabase client (we'll use REST API instead)
$headers = @{
    "Authorization" = "Bearer $ServiceKey"
    "apikey" = $ServiceKey
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$today = (Get-Date).ToString("yyyy-MM-dd")
Write-Host "Checking tasks created today ($today)..." -ForegroundColor Cyan

# Query tasks created today
$queryUrl = "$SupabaseUrl/rest/v1/checklist_tasks?due_date=eq.$today&select=id,company_id,site_id,due_date,status,custom_name,template_id,flag_reason,daypart,due_time&order=created_at.desc"

try {
    $response = Invoke-RestMethod -Uri $queryUrl -Method GET -Headers $headers
    
    Write-Host "`nFound $($response.Count) tasks for today" -ForegroundColor Cyan
    Write-Host "`nTask Details:" -ForegroundColor Yellow
    
    if ($response.Count -eq 0) {
        Write-Host "  No tasks found for today" -ForegroundColor Red
    } else {
        $response | ForEach-Object {
            Write-Host "`n  Task ID: $($_.id)" -ForegroundColor White
            Write-Host "    Name: $($_.custom_name)" -ForegroundColor Gray
            Write-Host "    Company ID: $($_.company_id)" -ForegroundColor Gray
            Write-Host "    Site ID: $($_.site_id)" -ForegroundColor Gray
            Write-Host "    Status: $($_.status)" -ForegroundColor Gray
            Write-Host "    Flag Reason: $($_.flag_reason)" -ForegroundColor Gray
            Write-Host "    Daypart: $($_.daypart)" -ForegroundColor Gray
            Write-Host "    Due Time: $($_.due_time)" -ForegroundColor Gray
        }
        
        # Group by company_id
        $byCompany = $response | Group-Object -Property company_id
        Write-Host "`n`nGrouped by Company ID:" -ForegroundColor Yellow
        $byCompany | ForEach-Object {
            Write-Host "  Company ID: $($_.Name) - $($_.Count) tasks" -ForegroundColor Cyan
        }
        
        # Group by site_id
        $bySite = $response | Group-Object -Property site_id
        Write-Host "`nGrouped by Site ID:" -ForegroundColor Yellow
        $bySite | ForEach-Object {
            Write-Host "  Site ID: $($_.Name) - $($_.Count) tasks" -ForegroundColor Cyan
        }
        
        # Check for callout_followup tasks
        $calloutTasks = $response | Where-Object { $_.flag_reason -eq 'callout_followup' }
        if ($calloutTasks.Count -gt 0) {
            Write-Host "`n⚠️  Found $($calloutTasks.Count) callout_followup tasks (these are filtered out on checklist page)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "`n❌ Error querying tasks:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

