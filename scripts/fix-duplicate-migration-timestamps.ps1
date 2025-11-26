# Fix Duplicate Migration Timestamps
# This script renames duplicate migration files to have unique timestamps

$ErrorActionPreference = "Stop"

Write-Host "🔧 Fixing Duplicate Migration Timestamps" -ForegroundColor Cyan
Write-Host ""

$migrationsPath = "supabase\migrations"

# Get all migration files
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -match '^\d{14}_' } | 
    Sort-Object Name

# Group by timestamp (first 14 digits)
$grouped = $migrationFiles | Group-Object { ($_.Name -split '_')[0] } | 
    Where-Object { $_.Count -gt 1 }

if ($grouped.Count -eq 0) {
    Write-Host "✅ No duplicate timestamps found!" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($grouped.Count) duplicate timestamp groups:" -ForegroundColor Yellow
Write-Host ""

$renamedCount = 0

foreach ($group in $grouped) {
    $timestamp = $group.Name
    $files = $group.Group | Sort-Object Name
    $fileCount = $files.Count
    
    Write-Host "Timestamp: $timestamp - $fileCount files" -ForegroundColor Cyan
    
    # Keep the first file as-is, rename the rest
    for ($i = 1; $i -lt $files.Count; $i++) {
        $file = $files[$i]
        $baseTimestamp = [long]$timestamp
        
        # Add 1 second (or more if needed) to make it unique
        $newTimestamp = ($baseTimestamp + $i).ToString()
        
        # Extract the rest of the filename (everything after timestamp_)
        $prefix = "$timestamp" + "_"
        $restOfName = $file.Name.Substring($prefix.Length)
        $newName = "$newTimestamp" + "_" + "$restOfName"
        $newPath = Join-Path $migrationsPath $newName
        
        Write-Host "  Renaming: $($file.Name)" -ForegroundColor Gray
        Write-Host "       To:  $newName" -ForegroundColor Green
        
        # Rename the file
        Rename-Item -Path $file.FullName -NewName $newName -ErrorAction Stop
        $renamedCount++
    }
    Write-Host ""
}

Write-Host "✅ Renamed $renamedCount migration files" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the SQL fix: supabase/sql/fix_duplicate_migrations.sql" -ForegroundColor White
Write-Host "2. Then run: supabase db push --include-all" -ForegroundColor White
Write-Host ""
