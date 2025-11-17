# Fixed Manual Test Script for Task Notification Cron
# Run this in PowerShell (not SQL editor!)

# Configuration
$PROJECT_REF = "xijoybubtrgbrhquqwrx"
$FUNCTION_NAME = "check-task-notifications"

# Get service role key from environment or prompt
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SERVICE_ROLE_KEY) {
    Write-Host "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in environment" -ForegroundColor Yellow
    Write-Host "Please enter your Supabase Service Role Key:" -ForegroundColor Yellow
    $SERVICE_ROLE_KEY = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SERVICE_ROLE_KEY)
    $SERVICE_ROLE_KEY = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Build the function URL
$FUNCTION_URL = "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"

Write-Host ""
Write-Host "🚀 Testing Task Notification Cron Function" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "Function URL: $FUNCTION_URL" -ForegroundColor Gray
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')" -ForegroundColor Gray
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""

try {
    # Make the request
    Write-Host "📡 Sending request..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
        } `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ("=" * 60) -ForegroundColor Green
    
    # Display full response as JSON
    Write-Host ""
    Write-Host "📋 Full Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
    Write-Host ""
    Write-Host "📊 Summary:" -ForegroundColor Cyan
    
    # Safely access properties with null checks
    $tasksChecked = if ($response.tasks_checked) { $response.tasks_checked } else { 0 }
    $readyNotifs = if ($response.ready_notifications) { $response.ready_notifications } else { 0 }
    $lateNotifs = if ($response.late_notifications) { $response.late_notifications } else { 0 }
    $totalNotifs = if ($response.total_notifications) { $response.total_notifications } else { 0 }
    $errorsCount = if ($response.errors_count) { $response.errors_count } else { 0 }
    $warningsCount = if ($response.warnings_count) { $response.warnings_count } else { 0 }
    $execTime = if ($response.execution_time_ms) { $response.execution_time_ms } else { 0 }
    
    Write-Host "  Tasks Checked: $tasksChecked" -ForegroundColor White
    Write-Host "  Ready Notifications: $readyNotifs" -ForegroundColor White
    Write-Host "  Late Notifications: $lateNotifs" -ForegroundColor White
    Write-Host "  Total Notifications: $totalNotifs" -ForegroundColor White
    Write-Host "  Errors: $errorsCount" -ForegroundColor $(if ($errorsCount -gt 0) { "Red" } else { "Green" })
    Write-Host "  Warnings: $warningsCount" -ForegroundColor $(if ($warningsCount -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Execution Time: ${execTime}ms" -ForegroundColor White
    
    if ($response.message) {
        Write-Host ""
        Write-Host "💬 Message: $($response.message)" -ForegroundColor Cyan
    }
    
    if ($errorsCount -gt 0 -and $response.metrics -and $response.metrics.errors) {
        Write-Host ""
        Write-Host "❌ Errors Found:" -ForegroundColor Red
        foreach ($error in $response.metrics.errors) {
            Write-Host "  - [$($error.context)] $($error.error)" -ForegroundColor Red
            if ($error.taskId) {
                Write-Host "    Task ID: $($error.taskId)" -ForegroundColor Gray
            }
        }
    }
    
    if ($warningsCount -gt 0 -and $response.metrics -and $response.metrics.warnings) {
        Write-Host ""
        Write-Host "⚠️  Warnings:" -ForegroundColor Yellow
        foreach ($warning in $response.metrics.warnings) {
            Write-Host "  - $($warning.message)" -ForegroundColor Yellow
            if ($warning.taskId) {
                Write-Host "    Task ID: $($warning.taskId)" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "✅ Test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host ("=" * 60) -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    
    if ($_.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host ""
            Write-Host "Response Body:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "  1. Check that the function is deployed: supabase functions deploy check-task-notifications" -ForegroundColor White
    Write-Host "  2. Verify SERVICE_ROLE_KEY is correct in Supabase Dashboard → Settings → API" -ForegroundColor White
    Write-Host "  3. Check function logs in Supabase Dashboard → Edge Functions → check-task-notifications → Logs" -ForegroundColor White
    
    exit 1
}

