# PowerShell script to organize the codebase
# Run from project root: .\scripts\organize-codebase.ps1

Write-Host "📁 Organizing Codebase..." -ForegroundColor Cyan

# Create directory structure
$dirs = @(
    "docs\architecture",
    "docs\guides",
    "docs\completion",
    "docs\changelog",
    "scripts\database",
    "scripts\auth",
    "scripts\setup",
    "sql\migrations",
    "sql\queries"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created: $dir" -ForegroundColor Green
    }
}

# Move completion docs
Write-Host "`n📄 Moving completion documents..." -ForegroundColor Cyan
Get-ChildItem -Filter "*_COMPLETE.md" | ForEach-Object {
    Move-Item $_.FullName -Destination "docs\completion\" -Force
    Write-Host "  Moved: $($_.Name)" -ForegroundColor Yellow
}

# Move guide docs
Write-Host "`n📚 Moving guide documents..." -ForegroundColor Cyan
$guidePatterns = @("*_GUIDE.md", "*_SETUP.md", "*_INSTRUCTIONS.md")
foreach ($pattern in $guidePatterns) {
    Get-ChildItem -Filter $pattern | ForEach-Object {
        Move-Item $_.FullName -Destination "docs\guides\" -Force
        Write-Host "  Moved: $($_.Name)" -ForegroundColor Yellow
    }
}

# Move SQL files (not in supabase/migrations)
Write-Host "`n🗄️  Moving SQL files..." -ForegroundColor Cyan
Get-ChildItem -Filter "*.sql" -Exclude "supabase" | ForEach-Object {
    # Skip if already in supabase folder
    if ($_.FullName -notlike "*supabase*") {
        Move-Item $_.FullName -Destination "sql\migrations\" -Force
        Write-Host "  Moved: $($_.Name)" -ForegroundColor Yellow
    }
}

# Move auth scripts
Write-Host "`n🔐 Moving auth scripts..." -ForegroundColor Cyan
Get-ChildItem -Filter "*auth*.js" | ForEach-Object {
    Move-Item $_.FullName -Destination "scripts\auth\" -Force
    Write-Host "  Moved: $($_.Name)" -ForegroundColor Yellow
}

# Move database scripts
Write-Host "`n📊 Moving database scripts..." -ForegroundColor Cyan
Get-ChildItem -Filter "*check-*.js", "*create-*.js", "*debug-*.js" | ForEach-Object {
    Move-Item $_.FullName -Destination "scripts\database\" -Force
    Write-Host "  Moved: $($_.Name)" -ForegroundColor Yellow
}

Write-Host "`n✅ Organization complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review moved files"
Write-Host "  2. Update any hardcoded paths"
Write-Host "  3. Update .gitignore if needed"
Write-Host "  4. Commit changes"


