# Simple Manual Test for Task Notification Cron
# Run this in PowerShell (not SQL editor!)

# Set your service role key here
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SERVICE_ROLE_KEY) {
    Write-Host "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in environment" -ForegroundColor Yellow
    Write-Host "Please enter your Supabase Service Role Key:" -ForegroundColor Yellow
    $SERVICE_ROLE_KEY = Read-Host
}

# Function URL
$FUNCTION_URL = "https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications"

Write-Host "`n🚀 Testing Task Notification Cron..." -ForegroundColor Cyan
Write-Host "URL: $FUNCTION_URL" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
        }

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

