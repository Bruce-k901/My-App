# Find All Inverted Files Script
# Searches for inverted favicon files in common locations

Write-Host "Searching for inverted favicon files..." -ForegroundColor Cyan
Write-Host ""

$searchPaths = @(
    "public/logo",
    "public",
    "public/assets",
    "."
)

$foundFiles = @()

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        Write-Host "Checking: $path" -ForegroundColor Yellow
        $files = Get-ChildItem -Path $path -File -Force -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -match 'inverted' -and $_.Extension -match '\.(png|ico|svg|jpg|jpeg)$'
        }
        
        if ($files.Count -gt 0) {
            foreach ($file in $files) {
                $foundFiles += $file
                $sizeKB = [math]::Round($file.Length / 1KB, 2)
                Write-Host "  FOUND: $($file.FullName) ($sizeKB KB)" -ForegroundColor Green
            }
        } else {
            Write-Host "  No inverted files found" -ForegroundColor Gray
        }
    }
}

Write-Host ""
if ($foundFiles.Count -eq 0) {
    Write-Host "No inverted favicon files found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Files are named with 'inverted' in the name" -ForegroundColor White
    Write-Host "  2. Files are in public/logo/ folder" -ForegroundColor White
    Write-Host "  3. Files have .png, .ico, or .svg extension" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected names:" -ForegroundColor Yellow
    Write-Host "  - inverted-180x180.png" -ForegroundColor Gray
    Write-Host "  - inverted-192x192.png" -ForegroundColor Gray
    Write-Host "  - inverted-512x512.png" -ForegroundColor Gray
} else {
    Write-Host "Found $($foundFiles.Count) file(s) total" -ForegroundColor Green
    Write-Host ""
    Write-Host "To set up admin icons, run:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/setup-inverted-favicons.ps1" -ForegroundColor White
}

Write-Host ""

