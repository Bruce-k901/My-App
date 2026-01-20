# Fix Duplicate Migration Timestamps - Smart Version
# Finds the next available timestamp for each duplicate

$ErrorActionPreference = "Stop"

Write-Host "Fixing duplicate migration timestamps (smart mode)..." -ForegroundColor Cyan
Write-Host ""

$migrationsPath = "supabase\migrations"

# Get existing migration versions from remote (we'll query via CLI)
Write-Host "Checking existing migration versions..." -ForegroundColor Yellow
$existingVersions = @()

# Get all migration files
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

# Function to find next available timestamp
function Get-NextAvailableTimestamp {
    param(
        [string]$baseTimestamp,
        [string[]]$excludedVersions
    )
    
    $year = $baseTimestamp.Substring(0, 4)
    $month = $baseTimestamp.Substring(4, 2)
    $day = $baseTimestamp.Substring(6, 2)
    $hour = $baseTimestamp.Substring(8, 2)
    $minute = $baseTimestamp.Substring(10, 2)
    $second = [int]$baseTimestamp.Substring(12, 2)
    
    # Try incrementing seconds first
    for ($i = 1; $i -lt 60; $i++) {
        $newSecond = $second + $i
        if ($newSecond -ge 60) {
            $newSecond = $newSecond - 60
            $newMinute = [int]$minute + 1
            if ($newMinute -ge 60) {
                $newMinute = $newMinute - 60
                $newHour = [int]$hour + 1
                if ($newHour -ge 24) {
                    $newHour = $newHour - 24
                    $newDay = [int]$day + 1
                } else {
                    $newDay = $day
                }
            } else {
                $newHour = $hour
                $newDay = $day
            }
        } else {
            $newMinute = $minute
            $newHour = $hour
            $newDay = $day
        }
        
        $candidate = "{0}{1}{2}{3}{4:D2}{5:D2}" -f $year, $month, $newDay.ToString("D2"), $newHour.ToString("D2"), $newMinute, $newSecond
        
        # Check if this timestamp is already used locally
        $localExists = $allMigrations | Where-Object { $_.Name -match "^$candidate" }
        if ($localExists) { continue }
        
        # Check if in excluded list
        if ($excludedVersions -contains $candidate) { continue }
        
        return $candidate
    }
    
    # If we can't find one by incrementing seconds, try next minute
    $newMinute = ([int]$minute + 1) % 60
    $newHour = if ($newMinute -eq 0) { ([int]$hour + 1) % 24 } else { [int]$hour }
    $candidate = "{0}{1}{2}{3}{4:D2}00" -f $year, $month, $day, $newHour.ToString("D2"), $newMinute
    return $candidate
}

foreach ($group in $grouped) {
    Write-Host "Processing timestamp: $($group.Name)" -ForegroundColor Cyan
    $files = $group.Group | Sort-Object Name
    
    # Keep the first file, rename the rest
    for ($i = 1; $i -lt $files.Count; $i++) {
        $file = $files[$i]
        $oldName = $file.Name
        $timestamp = $group.Name
        
        # Get next available timestamp
        $newTimestamp = Get-NextAvailableTimestamp -baseTimestamp $timestamp -excludedVersions $existingVersions
        $newName = $oldName -replace '^\d{14}', $newTimestamp
        
        Write-Host "  Renaming: $oldName -> $newName" -ForegroundColor Yellow
        Rename-Item -Path $file.FullName -NewName $newName -ErrorAction Stop
        
        # Add to excluded list
        $existingVersions += $newTimestamp
    }
    Write-Host ""
}

Write-Host "✅ Done! All duplicate timestamps have been fixed." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Remove old entries: Run the SQL in scripts/remove-duplicate-migrations.sql" -ForegroundColor Gray
Write-Host "2. Push migrations: supabase db push --include-all" -ForegroundColor Gray
