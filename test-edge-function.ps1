# Test Edge Function Script
# Replace YOUR_ANON_KEY_HERE with your actual anon key from Supabase Dashboard

# Get anon key from Supabase Dashboard:
# https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx/settings/api
# Look for "anon" key (NOT publishable key)
# It should start with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpam95YnVidHJnYnJocXVxd3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjcyNjEsImV4cCI6MjA3NTg0MzI2MX0.rlNW717094SZVsrFdXawkvy4keyFxjKPUAhK3og6r-o"

Write-Host "Testing Edge Function..." -ForegroundColor Cyan
Write-Host "URL: https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks" -ForegroundColor Gray

$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks" -Method Post -Headers $headers
    
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.success) {
        Write-Host ""
        Write-Host "Summary:" -ForegroundColor Cyan
        Write-Host "  Total tasks created: $($response.total_tasks_created)" -ForegroundColor Green
        Write-Host "  Daily tasks: $($response.daily_tasks_created)" -ForegroundColor Gray
        Write-Host "  Configured tasks (multi-time): $($response.configured_tasks_created)" -ForegroundColor Gray
        Write-Host "  PPM tasks: $($response.ppm_tasks_created)" -ForegroundColor Gray
        Write-Host "  Callout follow-up tasks: $($response.callout_followup_tasks_created)" -ForegroundColor Gray
        
        if ($response.errors -and $response.errors.Count -gt 0) {
            Write-Host ""
            Write-Host "Errors:" -ForegroundColor Yellow
            $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        } else {
            Write-Host ""
            Write-Host "No errors!" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host ""
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host ""
        Write-Host "401 Unauthorized - Invalid API key" -ForegroundColor Yellow
        Write-Host "Make sure you are using the anon key, not the publishable key" -ForegroundColor Yellow
        Write-Host "Get it from: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx/settings/api" -ForegroundColor Cyan
    }
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Full error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
