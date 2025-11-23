# ============================================================================
# Test Daily Task Edge Function
# ============================================================================
# This script manually triggers the generate-daily-tasks Edge Function
# to verify it's working correctly
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Daily Task Edge Function Test" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$projectRef = "xijoybubtrgbrhquqwrx"
$functionUrl = "https://$projectRef.supabase.co/functions/v1/generate-daily-tasks"

# Prompt for service role key
Write-Host "⚠️  You need the SERVICE ROLE KEY from Supabase Dashboard" -ForegroundColor Yellow
Write-Host "   Location: Settings → API → service_role (secret key)" -ForegroundColor Yellow
Write-Host ""
$serviceRoleKey = Read-Host "Enter your Supabase SERVICE ROLE KEY"

if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    Write-Host "❌ Error: Service role key is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Testing Edge Function..." -ForegroundColor Cyan
Write-Host "URL: $functionUrl" -ForegroundColor Gray
Write-Host ""

# Prepare headers
$headers = @{
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

try {
    # Call the Edge Function
    $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Headers $headers -ErrorAction Stop
    
    Write-Host "✅ Success! Edge Function executed successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "============================================================================" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 10
    Write-Host "============================================================================" -ForegroundColor Gray
    Write-Host ""
    
    # Summary
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Daily tasks created:        $($response.daily_tasks_created)" -ForegroundColor White
    Write-Host "  Weekly tasks created:       $($response.weekly_tasks_created)" -ForegroundColor White
    Write-Host "  Monthly tasks created:      $($response.monthly_tasks_created)" -ForegroundColor White
    Write-Host "  Annual tasks created:       $($response.annual_tasks_created)" -ForegroundColor White
    Write-Host "  PPM tasks created:          $($response.ppm_tasks_created)" -ForegroundColor White
    Write-Host "  Certificate tasks created:  $($response.certificate_tasks_created)" -ForegroundColor White
    Write-Host "  SOP review tasks created:   $($response.sop_review_tasks_created)" -ForegroundColor White
    Write-Host "  RA review tasks created:    $($response.ra_review_tasks_created)" -ForegroundColor White
    Write-Host "  Messaging tasks created:    $($response.messaging_tasks_created)" -ForegroundColor White
    
    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Errors encountered:" -ForegroundColor Yellow
        foreach ($error in $response.errors) {
            Write-Host "  - $error" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "✅ Edge Function is working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Verify tasks in database (run check-cron-status.sql)" -ForegroundColor White
    Write-Host "  2. Set up Edge Function schedule in Supabase Dashboard" -ForegroundColor White
    Write-Host "  3. Monitor logs tomorrow at 3:00 AM UTC" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error calling Edge Function" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    Write-Host "  1. Verify the service role key is correct" -ForegroundColor White
    Write-Host "  2. Check if Edge Function is deployed in Supabase Dashboard" -ForegroundColor White
    Write-Host "  3. Check Edge Function logs in Supabase Dashboard" -ForegroundColor White
    
    exit 1
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
