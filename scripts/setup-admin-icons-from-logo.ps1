# Setup Admin Icons from Logo Folder
# Automatically finds and uses inverted icon files from public/logo

$logoPath = "public/logo"
$publicPath = "public"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Admin Icon Setup from Logo Folder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find all image files, excluding send_icon
$allImageFiles = Get-ChildItem -Path $logoPath -File -Force | Where-Object {
    $_.Extension -match '\.(png|ico|svg|jpg|jpeg)$' -and $_.Name -notmatch 'send'
} | Sort-Object LastWriteTime -Descending

# Also check for files with "inverted", "icon", "favicon", or "admin" in the name
$invertedFiles = Get-ChildItem -Path $logoPath -File -Force | Where-Object {
    $name = $_.BaseName.ToLower()
    ($name -match 'inverted|icon|favicon|admin') -and $_.Extension -match '\.(png|ico|svg|jpg|jpeg)$'
} | Sort-Object LastWriteTime -Descending

# Use inverted files if found, otherwise use all image files (excluding send_icon)
$sourceFiles = if ($invertedFiles.Count -gt 0) { $invertedFiles } else { $allImageFiles }

Write-Host "Found image files in $logoPath :" -ForegroundColor Yellow
if ($sourceFiles.Count -eq 0) {
    Write-Host "  No icon files found (excluding send_icon.png)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure your 3 inverted icon files are in: $logoPath" -ForegroundColor Yellow
    Write-Host "  - They can be named anything (e.g., icon1.png, inverted.png, etc.)" -ForegroundColor Gray
    Write-Host "  - Any PNG, ICO, SVG, JPG, or JPEG file will work" -ForegroundColor Gray
    Write-Host "  - Files with 'send' in the name will be excluded" -ForegroundColor Gray
    exit 1
}

foreach ($file in $sourceFiles) {
    $sizeKB = [math]::Round($file.Length / 1KB, 2)
    Write-Host "  - $($file.Name) ($sizeKB KB)" -ForegroundColor Green
}

Write-Host ""

# Select files for each size
# If we have 3+ files, use different ones; otherwise reuse
$file192 = if ($sourceFiles.Count -ge 1) { $sourceFiles[0] } else { $null }
$file180 = if ($sourceFiles.Count -ge 2) { $sourceFiles[1] } elseif ($sourceFiles.Count -ge 1) { $sourceFiles[0] } else { $null }
$file512 = if ($sourceFiles.Count -ge 3) { $sourceFiles[2] } elseif ($sourceFiles.Count -ge 1) { $sourceFiles[0] } else { $null }

Write-Host "Mapping files to icon sizes:" -ForegroundColor Cyan
Write-Host "  192x192 -> $($file192.Name)" -ForegroundColor Gray
Write-Host "  180x180 -> $($file180.Name)" -ForegroundColor Gray
Write-Host "  512x512 -> $($file512.Name)" -ForegroundColor Gray
Write-Host ""

# Function to copy/resize
function Copy-ImageAs {
    param(
        [string]$Source,
        [string]$Destination,
        [int]$Width = 0,
        [int]$Height = 0
    )
    
    try {
        $magickAvailable = Get-Command magick -ErrorAction SilentlyContinue
        if ($magickAvailable -and $Width -gt 0 -and $Height -gt 0) {
            & magick $Source -resize "${Width}x${Height}" $Destination
            Write-Host "  Created $([System.IO.Path]::GetFileName($Destination)) ($Width x $Height)" -ForegroundColor Green
        } else {
            Copy-Item $Source $Destination -Force
            Write-Host "  Created $([System.IO.Path]::GetFileName($Destination)) (copied)" -ForegroundColor Green
            if (-not $magickAvailable -and ($Width -gt 0 -or $Height -gt 0)) {
                Write-Host "    Note: Install ImageMagick for auto-resizing" -ForegroundColor Yellow
            }
        }
        return $true
    } catch {
        Write-Host "  Failed: $_" -ForegroundColor Red
        return $false
    }
}

Write-Host "Creating admin icon files..." -ForegroundColor Cyan
Write-Host ""

$success = $true
$success = (Copy-ImageAs -Source $file192.FullName -Destination (Join-Path $publicPath "admin-icon-192x192.png") -Width 192 -Height 192) -and $success
$success = (Copy-ImageAs -Source $file180.FullName -Destination (Join-Path $publicPath "admin-apple-touch-icon.png") -Width 180 -Height 180) -and $success
$success = (Copy-ImageAs -Source $file512.FullName -Destination (Join-Path $publicPath "admin-icon-512x512.png") -Width 512 -Height 512) -and $success

Write-Host ""
if ($success) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Admin icons setup complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created in: $publicPath" -ForegroundColor Cyan
    Write-Host "  - admin-icon-192x192.png" -ForegroundColor Gray
    Write-Host "  - admin-icon-512x512.png" -ForegroundColor Gray
    Write-Host "  - admin-apple-touch-icon.png" -ForegroundColor Gray
    Write-Host ""
    Write-Host "The admin PWA is now ready to use!" -ForegroundColor Green
} else {
    Write-Host "Some files failed to create. Please check the errors above." -ForegroundColor Red
}

Write-Host ""

