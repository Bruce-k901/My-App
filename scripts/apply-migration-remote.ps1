# ============================================================================
# Apply Migration Directly to Remote Database
# ============================================================================
# This script applies the cron migration directly to your remote Supabase database
# bypassing the local Supabase CLI issues
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Apply Cron Migration to Remote Database" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for database password
Write-Host "⚠️  You need your DATABASE PASSWORD from Supabase Dashboard" -ForegroundColor Yellow
Write-Host "   Location: Settings → Database → Database password" -ForegroundColor Yellow
Write-Host "   (This is different from your service role key)" -ForegroundColor Yellow
Write-Host ""
$dbPassword = Read-Host "Enter your database password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

if ([string]::IsNullOrWhiteSpace($dbPasswordPlain)) {
    Write-Host "❌ Error: Database password is required" -ForegroundColor Red
    exit 1
}

# Build connection string
$projectRef = "xijoybubtrgbrhquqwrx"
$dbUrl = "postgresql://postgres.${projectRef}:${dbPasswordPlain}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

Write-Host ""
Write-Host "Connecting to remote database..." -ForegroundColor Cyan
Write-Host ""

try {
    # Use supabase db push with direct URL
    $env:SUPABASE_DB_PASSWORD = $dbPasswordPlain
    
    Write-Host "Applying migration..." -ForegroundColor Cyan
    supabase db push --db-url $dbUrl --include-all
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Verify the cron job was created" -ForegroundColor White
        Write-Host "  2. Check Supabase Dashboard → SQL Editor" -ForegroundColor White
        Write-Host "  3. Run: SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks-http';" -ForegroundColor White
    }
    else {
        Write-Host ""
        Write-Host "❌ Migration failed" -ForegroundColor Red
        Write-Host "Try the SQL Editor approach instead (see QUICK_ACTION_GUIDE.md)" -ForegroundColor Yellow
    }
    
}
catch {
    Write-Host "❌ Error applying migration" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Use SQL Editor approach (see QUICK_ACTION_GUIDE.md)" -ForegroundColor Yellow
}
finally {
    # Clear password from environment
    $env:SUPABASE_DB_PASSWORD = $null
    $dbPasswordPlain = $null
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
