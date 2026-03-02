# Quick script to invoke the generate-daily-tasks edge function
# Make sure your SUPABASE_SERVICE_ROLE_KEY is set correctly in .env.local

param(
    [string]$ServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL

if (-not $supabaseUrl) {
    Write-Host "Error: NEXT_PUBLIC_SUPABASE_URL not set" -ForegroundColor Red
    exit 1
}

if (-not $ServiceKey -or $ServiceKey.Length -lt 100) {
    Write-Host "Error: SUPABASE_SERVICE_ROLE_KEY appears to be incomplete or missing" -ForegroundColor Red
    Write-Host "Please check your .env.local file and ensure the key is complete" -ForegroundColor Yellow
    Write-Host "`nYou can also run this manually:" -ForegroundColor Cyan
    Write-Host "`$url = `"$supabaseUrl/functions/v1/generate-daily-tasks`"" -ForegroundColor Gray
    Write-Host "`$key = `"YOUR_FULL_SERVICE_ROLE_KEY`"" -ForegroundColor Gray
    Write-Host "Invoke-RestMethod -Uri `$url -Method POST -Headers @{ `"Authorization`" = `"Bearer `$key`"; `"Content-Type`" = `"application/json`" }" -ForegroundColor Gray
    exit 1
}

$url = "$supabaseUrl/functions/v1/generate-daily-tasks"
Write-Host "Calling edge function: $url" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
        "Authorization" = "Bearer $ServiceKey"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n✅ Success! Task generation completed." -ForegroundColor Green
    Write-Host "`nResults:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host "`n⚠️  Warnings/Errors:" -ForegroundColor Yellow
        $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
} catch {
    Write-Host "`n❌ Error calling edge function:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}


