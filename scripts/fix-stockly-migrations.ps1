# Script to identify migrations that need stockly schema checks
# This finds all migrations that reference stockly schema without conditional checks

$migrationsPath = "supabase\migrations"
$files = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | Where-Object { $_.Name -match "^\d{14}_" }

$needsFix = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file references stockly schema
    if ($content -match "stockly\.") {
        # Check if it already has conditional checks
        if ($content -notmatch "pg_namespace.*stockly|IF NOT EXISTS.*pg_namespace.*stockly") {
            $needsFix += $file.Name
            Write-Host "⚠️  $($file.Name) - Needs conditional check"
        } else {
            Write-Host "✅ $($file.Name) - Already has conditional check"
        }
    }
}

Write-Host "`nTotal files needing fixes: $($needsFix.Count)"
Write-Host "Files:"
$needsFix | ForEach-Object { Write-Host "  - $_" }
