# Fix Duplicate Migration Timestamps
# This script renames duplicate migration files to have unique timestamps

$ErrorActionPreference = "Stop"

Write-Host "Fixing duplicate migration timestamps..." -ForegroundColor Cyan
Write-Host ""

$migrationsPath = "supabase\migrations"

# Find all migration files
$allMigrations = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -match '^(\d{14})_' }

# Group by timestamp
$grouped = $allMigrations | Group-Object { 
    if ($_.Name -match '^(\d{14})_') { 
        $matches[1] 
    } 
} | Where-Object { $_.Count -gt 1 }

if ($grouped.Count -eq 0) {
    Write-Host "No duplicate timestamps found!" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($grouped.Count) duplicate timestamp groups" -ForegroundColor Yellow
Write-Host ""

foreach ($group in $grouped) {
    Write-Host "Processing timestamp: $($group.Name)" -ForegroundColor Cyan
    $files = $group.Group | Sort-Object Name
    
    # Keep the first file, rename the rest
    for ($i = 1; $i -lt $files.Count; $i++) {
        $file = $files[$i]
        $oldName = $file.Name
        $timestamp = $group.Name
        
        # Increment timestamp by 1 second for each duplicate
        $year = $timestamp.Substring(0, 4)
        $month = $timestamp.Substring(4, 2)
        $day = $timestamp.Substring(6, 2)
        $hour = $timestamp.Substring(8, 2)
        $minute = $timestamp.Substring(10, 2)
        $second = [int]$timestamp.Substring(12, 2)
        
        # Add i seconds to make it unique
        $newSecond = $second + $i
        if ($newSecond -ge 60) {
            $newSecond = $newSecond - 60
            $minute = [int]$minute + 1
            if ($minute -ge 60) {
                $minute = $minute - 60
                $hour = [int]$hour + 1
            }
        }
        
        $newTimestamp = "{0}{1}{2}{3}{4:D2}{5:D2}" -f $year, $month, $day, $hour, [int]$minute, $newSecond
        $newName = $oldName -replace '^\d{14}', $newTimestamp
        
        Write-Host "  Renaming: $oldName -> $newName" -ForegroundColor Yellow
        Rename-Item -Path $file.FullName -NewName $newName -ErrorAction Stop
    }
    Write-Host ""
}

Write-Host "✅ Done! All duplicate timestamps have been fixed." -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: supabase db push --include-all" -ForegroundColor White
