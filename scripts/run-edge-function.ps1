# Simple script to call the generate-daily-tasks edge function
param(
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$ServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

if (-not $SupabaseUrl) {
    Write-Host "Error: NEXT_PUBLIC_SUPABASE_URL not set" -ForegroundColor Red
    exit 1
}

if (-not $ServiceKey) {
    Write-Host "Error: SUPABASE_SERVICE_ROLE_KEY not set" -ForegroundColor Red
    exit 1
}

$url = "$SupabaseUrl/functions/v1/generate-daily-tasks"
Write-Host "Calling edge function: $url" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
        "Authorization" = "Bearer $ServiceKey"
        "Content-Type" = "application/json"
    }
    
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host "`nWarnings/Errors:" -ForegroundColor Yellow
        $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}


