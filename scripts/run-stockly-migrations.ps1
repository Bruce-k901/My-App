# Run Stockly Migrations Script
# This script applies all Stockly migration files to the Supabase database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stockly Migrations Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Install: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Check if project is linked
Write-Host "Checking project link status..." -ForegroundColor Yellow
$linkStatus = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not check project link status" -ForegroundColor Yellow
    Write-Host "You may need to link your project first:" -ForegroundColor Yellow
    Write-Host "  supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "✓ Project link check complete" -ForegroundColor Green
}
Write-Host ""

# List migration files
Write-Host "Stockly migration files to apply:" -ForegroundColor Yellow
$migrationFiles = Get-ChildItem -Path "supabase\migrations" -Filter "20250217*.sql" | Sort-Object Name
foreach ($file in $migrationFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor White
}
Write-Host ""

if ($migrationFiles.Count -eq 0) {
    Write-Host "ERROR: No Stockly migration files found!" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($migrationFiles.Count) migration file(s)" -ForegroundColor Green
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to apply these migrations? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Applying migrations..." -ForegroundColor Yellow
Write-Host ""

# Apply migrations
$output = supabase db push 2>&1
$exitCode = $LASTEXITCODE

Write-Host $output

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Migrations applied successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run verification script: supabase/sql/verify_stockly_migrations.sql" -ForegroundColor Cyan
    Write-Host "2. Check STOCKLY_INTEGRATION_MIGRATIONS.md for details" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ Migration failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "1. Link your project: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Cyan
    Write-Host "2. Check database connection" -ForegroundColor Cyan
    Write-Host "3. Verify migration files are correct" -ForegroundColor Cyan
    exit 1
}










