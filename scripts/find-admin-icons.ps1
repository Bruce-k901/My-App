# Find Admin Icons Script
# Lists all files in public/logo to help identify inverted icons

$logoPath = "public/logo"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Admin Icon Files Finder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $logoPath)) {
    Write-Host "Directory $logoPath does not exist!" -ForegroundColor Red
    exit 1
}

Write-Host "Scanning: $logoPath" -ForegroundColor Yellow
Write-Host ""

$allFiles = Get-ChildItem -Path $logoPath -File -Force

if ($allFiles.Count -eq 0) {
    Write-Host "No files found in $logoPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($allFiles.Count) file(s):" -ForegroundColor Green
Write-Host ""

$imageFiles = $allFiles | Where-Object { $_.Extension -match '\.(png|ico|svg|jpg|jpeg)$' }
$otherFiles = $allFiles | Where-Object { $_.Extension -notmatch '\.(png|ico|svg|jpg|jpeg)$' }

if ($imageFiles.Count -gt 0) {
    Write-Host "IMAGE FILES:" -ForegroundColor Cyan
    Write-Host "------------" -ForegroundColor Cyan
    foreach ($file in $imageFiles | Sort-Object LastWriteTime -Descending) {
        $sizeKB = [math]::Round($file.Length / 1KB, 2)
        $age = (Get-Date) - $file.LastWriteTime
        $ageText = if ($age.Days -gt 0) { "$($age.Days) days ago" } 
                   elseif ($age.Hours -gt 0) { "$($age.Hours) hours ago" }
                   elseif ($age.Minutes -gt 0) { "$($age.Minutes) minutes ago" }
                   else { "just now" }
        
        $marker = ""
        if ($file.Name -match 'inverted|icon|favicon|admin') { $marker = "[INVERTED ICON]" }
        if ($file.Name -match 'send') { $marker = "[SEND ICON]" }
        
        Write-Host "  $marker $($file.Name)" -ForegroundColor White
        Write-Host "     Size: $sizeKB KB" -ForegroundColor Gray
        Write-Host "     Modified: $($file.LastWriteTime) ($ageText)" -ForegroundColor Gray
        Write-Host ""
    }
}

if ($otherFiles.Count -gt 0) {
    Write-Host "OTHER FILES:" -ForegroundColor Yellow
    Write-Host "------------" -ForegroundColor Yellow
    foreach ($file in $otherFiles) {
        Write-Host "  $($file.Name) ($($file.Extension))" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Recommendations:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($imageFiles.Count -ge 3) {
    Write-Host "Found $($imageFiles.Count) image files - ready to use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To set up admin icons, run:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/setup-admin-icons.ps1" -ForegroundColor White
} elseif ($imageFiles.Count -gt 0) {
    Write-Host "Found $($imageFiles.Count) image file(s)" -ForegroundColor Yellow
    Write-Host "   The script will use the available files for all icon sizes." -ForegroundColor Gray
    Write-Host ""
    Write-Host "To set up admin icons, run:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/setup-admin-icons.ps1" -ForegroundColor White
} else {
    Write-Host "No image files found" -ForegroundColor Red
    Write-Host "   Please add your inverted icon files (PNG, ICO, or SVG) to:" -ForegroundColor Yellow
    Write-Host "   $logoPath" -ForegroundColor White
}

Write-Host ""
