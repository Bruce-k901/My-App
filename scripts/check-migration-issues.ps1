# Check all pending migrations for common issues
# This helps identify problems before running migrations

$ErrorActionPreference = "Stop"

Write-Host "Checking Pending Migrations for Common Issues" -ForegroundColor Cyan
Write-Host ""

$migrationsPath = "supabase\migrations"
$issues = @()

# Get pending migrations (files that match timestamp pattern)
$migrations = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -match '^\d{14}_' } | 
    Sort-Object Name

Write-Host "Found $($migrations.Count) migration files to check" -ForegroundColor Yellow
Write-Host ""

foreach ($migration in $migrations) {
    $content = Get-Content $migration.FullName -Raw
    $issuesFound = @()
    
    # Check for CREATE POLICY without DROP POLICY IF EXISTS
    if ($content -match 'CREATE POLICY\s+(\w+)') {
        $policyName = $matches[1]
        if ($content -notmatch "DROP POLICY IF EXISTS $policyName") {
            $issuesFound += "CREATE POLICY '$policyName' without DROP POLICY IF EXISTS"
        }
    }
    
    # Check for CREATE TRIGGER without DROP TRIGGER IF EXISTS
    if ($content -match 'CREATE TRIGGER\s+(\w+)') {
        $triggerName = $matches[1]
        if ($content -notmatch "DROP TRIGGER IF EXISTS $triggerName") {
            $issuesFound += "CREATE TRIGGER '$triggerName' without DROP TRIGGER IF EXISTS"
        }
    }
    
    # Check for CREATE OR REPLACE FUNCTION with RETURNS TABLE
    if ($content -match 'CREATE OR REPLACE FUNCTION.*RETURNS TABLE') {
        # Extract function name if possible
        if ($content -match 'CREATE OR REPLACE FUNCTION\s+(\w+\.)?(\w+)\s*\(.*RETURNS TABLE') {
            $functionName = $matches[2]
            if ($content -notmatch "DROP FUNCTION IF EXISTS.*$functionName") {
                $issuesFound += "CREATE OR REPLACE FUNCTION with RETURNS TABLE should use DROP FUNCTION IF EXISTS first"
            }
        } else {
            $issuesFound += "CREATE OR REPLACE FUNCTION with RETURNS TABLE should use DROP FUNCTION IF EXISTS first"
        }
    }
    
    if ($issuesFound.Count -gt 0) {
        $issues += [PSCustomObject]@{
            File = $migration.Name
            Issues = $issuesFound
        }
    }
}

if ($issues.Count -eq 0) {
    Write-Host "[OK] No issues found! All migrations look good." -ForegroundColor Green
} else {
    Write-Host "[WARNING] Found issues in $($issues.Count) migration(s):" -ForegroundColor Yellow
    Write-Host ""
    foreach ($issue in $issues) {
        Write-Host "File: $($issue.File)" -ForegroundColor Cyan
        foreach ($item in $issue.Issues) {
            Write-Host "   [ISSUE] $item" -ForegroundColor Red
        }
        Write-Host ""
    }
}

Write-Host ""
Write-Host "Common fixes:" -ForegroundColor Yellow
Write-Host "   - Add DROP POLICY IF EXISTS before CREATE POLICY" -ForegroundColor White
Write-Host "   - Add DROP TRIGGER IF EXISTS before CREATE TRIGGER" -ForegroundColor White
Write-Host "   - Add DROP FUNCTION IF EXISTS before CREATE OR REPLACE FUNCTION with RETURNS TABLE" -ForegroundColor White
Write-Host "   - Wrap DROP statements in DO blocks that check table existence" -ForegroundColor White

