# Check if tasks have valid templates
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

# Get tasks with template_id
$tasksUrl = "$SupabaseUrl/rest/v1/checklist_tasks?due_date=eq.$today&select=id,template_id,custom_name,company_id,site_id&order=created_at.desc"
$tasks = Invoke-RestMethod -Uri $tasksUrl -Method GET -Headers $headers

Write-Host "Found $($tasks.Count) tasks for today" -ForegroundColor Cyan

# Get unique template IDs
$templateIds = $tasks | Where-Object { $_.template_id } | ForEach-Object { $_.template_id } | Select-Object -Unique

Write-Host "`nTasks with template_id: $($templateIds.Count)" -ForegroundColor Yellow
Write-Host "Tasks without template_id: $(($tasks | Where-Object { -not $_.template_id }).Count)" -ForegroundColor Yellow

if ($templateIds.Count -gt 0) {
    # Check if templates exist
    $templateIdsStr = $templateIds -join ','
    $templatesUrl = "$SupabaseUrl/rest/v1/task_templates?id=in.($templateIdsStr)&select=id,name,frequency,is_active"
    $templates = Invoke-RestMethod -Uri $templatesUrl -Method GET -Headers $headers
    
    Write-Host "`nTemplates found: $($templates.Count)" -ForegroundColor Cyan
    
    $templatesMap = @{}
    $templates | ForEach-Object { $templatesMap[$_.id] = $_ }
    
    Write-Host "`nTask Template Status:" -ForegroundColor Yellow
    $tasks | ForEach-Object {
        $task = $_
        if ($task.template_id) {
            if ($templatesMap.ContainsKey($task.template_id)) {
                $template = $templatesMap[$task.template_id]
                Write-Host "  ✅ Task $($task.id.Substring(0,8))... has template: $($template.name) (frequency: $($template.frequency), active: $($template.is_active))" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Task $($task.id.Substring(0,8))... has template_id $($task.template_id) but template NOT FOUND" -ForegroundColor Red
            }
        } else {
            Write-Host "  ⚠️  Task $($task.id.Substring(0,8))... has NO template_id" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "`n⚠️  No tasks have template_id values!" -ForegroundColor Red
}


