# Repair Supabase Migration History
# This script generates SQL to repair the migration history table
# Run the generated SQL in Supabase SQL Editor

$ErrorActionPreference = "Stop"

Write-Host "🔧 Supabase Migration History Repair Script" -ForegroundColor Cyan
Write-Host ""

# Get all migration files
$migrationsPath = "supabase\migrations"
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -match '^\d{14}_' } | 
    Sort-Object Name

Write-Host "Found $($migrationFiles.Count) migration files" -ForegroundColor Green

# Extract migration versions from filenames
$migrationVersions = @()
foreach ($file in $migrationFiles) {
    if ($file.Name -match '^(\d{14})_') {
        $version = $matches[1]
        $migrationVersions += $version
    }
}

Write-Host "Extracted $($migrationVersions.Count) migration versions" -ForegroundColor Green
Write-Host ""

# Generate SQL repair script
$sqlScript = @"
-- ============================================================================
-- MIGRATION HISTORY REPAIR SCRIPT
-- ============================================================================
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- This script repairs the supabase_migrations.schema_migrations table
-- to match your local migration files.
-- ============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. After running, try: supabase db pull
-- ============================================================================

-- First, mark the problematic migration as reverted (if it exists)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20251125000001';

-- Now insert/update all local migrations as 'applied'
-- This ensures the remote database knows about all your local migrations

"@

# Add INSERT statements for each migration
foreach ($version in $migrationVersions) {
    $sqlScript += @"
-- Migration: $version
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('$version', 'Migration $version')
ON CONFLICT (version) DO NOTHING;

"@
}

$sqlScript += @"

-- Verify the repair
SELECT 
    version,
    name,
    inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- ============================================================================
-- END OF REPAIR SCRIPT
-- ============================================================================
"@

# Save to file
$outputPath = "supabase\sql\repair_migration_history.sql"
$sqlScript | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "✅ Generated repair script: $outputPath" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "2. Copy the contents of: $outputPath" -ForegroundColor White
Write-Host "3. Paste and run the SQL script" -ForegroundColor White
Write-Host "4. After running, test: supabase db pull" -ForegroundColor White
Write-Host ""

