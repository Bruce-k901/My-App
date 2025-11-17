# Manual Test Script for Task Notification Cron
# This script manually invokes the check-task-notifications edge function

# Configuration
$PROJECT_REF = "xijoybubtrgbrhquqwrx"
$FUNCTION_NAME = "check-task-notifications"

# Get service role key from environment or prompt
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SERVICE_ROLE_KEY) {
    Write-Host "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in environment" -ForegroundColor Yellow
    Write-Host "Please set it or enter it now:" -ForegroundColor Yellow
    $SERVICE_ROLE_KEY = Read-Host "Enter your Supabase Service Role Key" -AsSecureString
    $SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SERVICE_ROLE_KEY)
    )
}

# Build the function URL
$FUNCTION_URL = "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"

Write-Host "`n🚀 Testing Task Notification Cron Function" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Function URL: $FUNCTION_URL" -ForegroundColor Gray
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')" -ForegroundColor Gray
Write-Host "=" * 60 -ForegroundColor Cyan
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

    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Green
    
    # Pretty print the response
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    Write-Host "`n📊 Summary:" -ForegroundColor Cyan
    Write-Host "  Tasks Checked: $($response.tasks_checked)" -ForegroundColor White
    Write-Host "  Ready Notifications: $($response.ready_notifications)" -ForegroundColor White
    Write-Host "  Late Notifications: $($response.late_notifications)" -ForegroundColor White
    Write-Host "  Total Notifications: $($response.total_notifications)" -ForegroundColor White
    Write-Host "  Errors: $($response.errors_count)" -ForegroundColor $(if ($response.errors_count -gt 0) { "Red" } else { "Green" })
    Write-Host "  Warnings: $($response.warnings_count)" -ForegroundColor $(if ($response.warnings_count -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Execution Time: $($response.execution_time_ms)ms" -ForegroundColor White
    
    if ($response.errors_count -gt 0) {
        Write-Host "`n❌ Errors Found:" -ForegroundColor Red
        $response.metrics.errors | ForEach-Object {
            Write-Host "  - [$($_.context)] $($_.error)" -ForegroundColor Red
            if ($_.taskId) {
                Write-Host "    Task ID: $($_.taskId)" -ForegroundColor Gray
            }
        }
    }
    
    if ($response.warnings_count -gt 0) {
        Write-Host "`n⚠️  Warnings:" -ForegroundColor Yellow
        $response.metrics.warnings | ForEach-Object {
            Write-Host "  - $($_.message)" -ForegroundColor Yellow
            if ($_.taskId) {
                Write-Host "    Task ID: $($_.taskId)" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host "`n✅ Test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host "=" * 60 -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host "`nError Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    
    if ($_.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nResponse Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Yellow
    }
    
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "  1. Check that the function is deployed: supabase functions deploy check-task-notifications" -ForegroundColor White
    Write-Host "  2. Verify SERVICE_ROLE_KEY is correct in Supabase Dashboard → Settings → API" -ForegroundColor White
    Write-Host "  3. Check function logs in Supabase Dashboard → Edge Functions → check-task-notifications → Logs" -ForegroundColor White
    
    exit 1
}

