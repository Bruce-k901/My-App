# Safe Migration Push Script
# This script helps you push migrations safely

Write-Host "🔍 Supabase Migration Push Helper" -ForegroundColor Cyan
Write-Host ""

Write-Host "The CLI detected some migrations that appear out of order." -ForegroundColor Yellow
Write-Host ""
Write-Host "Before proceeding, please confirm:" -ForegroundColor White
Write-Host "1. Have these migrations already been applied to your remote database?" -ForegroundColor White
Write-Host "2. Or is it safe to apply them now?" -ForegroundColor White
Write-Host ""

$response = Read-Host "Do you want to proceed with --include-all? (y/n)"

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "🚀 Pushing migrations with --include-all flag..." -ForegroundColor Green
    Write-Host ""
    supabase db push --include-all
} else {
    Write-Host ""
    Write-Host "⏸️  Skipped. Please check your remote migrations first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run this SQL in Supabase Dashboard → SQL Editor:" -ForegroundColor White
    Write-Host "   SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Compare with your local migrations" -ForegroundColor White
    Write-Host "3. Then decide whether to use --include-all or manually repair" -ForegroundColor White
}

