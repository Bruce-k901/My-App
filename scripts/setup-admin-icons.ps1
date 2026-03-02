# Setup Admin Icons Script
# This script finds inverted favicon files in public/logo and sets them up for admin PWA

$logoPath = "public/logo"
$publicPath = "public"

Write-Host "Looking for inverted icon files in $logoPath..." -ForegroundColor Cyan

# Find all image files in logo folder
$imageFiles = Get-ChildItem -Path $logoPath -File | Where-Object {
    $_.Extension -match '\.(png|ico|svg|jpg|jpeg)$'
} | Sort-Object LastWriteTime -Descending

if ($imageFiles.Count -eq 0) {
    Write-Host "No image files found in $logoPath" -ForegroundColor Red
    Write-Host "Please add your inverted favicon files to: $logoPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($imageFiles.Count) image file(s):" -ForegroundColor Green
foreach ($file in $imageFiles) {
    Write-Host "  - $($file.Name) ($($file.Length) bytes, modified: $($file.LastWriteTime))" -ForegroundColor Gray
}

# Look for inverted icon files (prioritize files with "inverted", "icon", "favicon", "admin" in name)
$invertedIcons = $imageFiles | Where-Object {
    $name = $_.BaseName.ToLower()
    $name -match 'inverted|icon|favicon|admin' -or $name -notmatch 'send'
} | Sort-Object LastWriteTime -Descending

# If we have 3 or more files, use the 3 most recent (excluding send_icon)
$candidateFiles = if ($invertedIcons.Count -ge 3) {
    $invertedIcons | Select-Object -First 3
} elseif ($invertedIcons.Count -gt 0) {
    $invertedIcons
} else {
    # Fallback: use all files except send_icon, or just use all files
    $imageFiles | Where-Object { $_.Name -notmatch 'send' } | Select-Object -First 3
    if ($imageFiles.Count -eq 1) {
        $imageFiles
    }
}

Write-Host ""
Write-Host "Selected files for admin icons:" -ForegroundColor Cyan
foreach ($file in $candidateFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor Yellow
}

# Determine which file to use for which size
# If we have 3 files, try to match by size or use in order
$smallIcon = $candidateFiles[0]
$mediumIcon = if ($candidateFiles.Count -ge 2) { $candidateFiles[1] } else { $candidateFiles[0] }
$largeIcon = if ($candidateFiles.Count -ge 3) { $candidateFiles[2] } else { $candidateFiles[0] }

# Try to match files by size hints in filename or actual size
foreach ($file in $candidateFiles) {
    $name = $file.BaseName.ToLower()
    $size = $file.Length
    
    # Check filename for size hints
    if ($name -match '192|small|tiny') {
        $smallIcon = $file
    } elseif ($name -match '512|large|big') {
        $largeIcon = $file
    } elseif ($name -match '180|apple|touch') {
        $mediumIcon = $file
    } elseif ($size -lt 50000) {
        $smallIcon = $file
    } elseif ($size -gt 200000) {
        $largeIcon = $file
    }
}

Write-Host ""
Write-Host "Creating admin icon files..." -ForegroundColor Cyan

# Function to copy/resize image
function Copy-ImageAs {
    param(
        [string]$Source,
        [string]$Destination,
        [int]$Width = 0,
        [int]$Height = 0
    )
    
    try {
        # Try to use ImageMagick if available
        $magickAvailable = Get-Command magick -ErrorAction SilentlyContinue
        if ($magickAvailable -and $Width -gt 0 -and $Height -gt 0) {
            & magick $Source -resize "${Width}x${Height}" $Destination
            Write-Host "  Created $Destination ($Width x $Height) from $([System.IO.Path]::GetFileName($Source))" -ForegroundColor Green
        } else {
            Copy-Item $Source $Destination -Force
            Write-Host "  Created $Destination from $([System.IO.Path]::GetFileName($Source)) (copied)" -ForegroundColor Green
            if (-not $magickAvailable -and ($Width -gt 0 -or $Height -gt 0)) {
                Write-Host "    Note: Install ImageMagick to auto-resize to ${Width}x${Height}" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  Failed to create $Destination : $_" -ForegroundColor Red
    }
}

# Create admin icons with appropriate source files
Write-Host ""
Write-Host "Mapping files to icon sizes:" -ForegroundColor Cyan
Write-Host "  192x192 -> $($smallIcon.Name)" -ForegroundColor Gray
Write-Host "  180x180 -> $($mediumIcon.Name)" -ForegroundColor Gray
Write-Host "  512x512 -> $($largeIcon.Name)" -ForegroundColor Gray
Write-Host ""

Copy-ImageAs -Source $smallIcon.FullName -Destination (Join-Path $publicPath "admin-icon-192x192.png") -Width 192 -Height 192
Copy-ImageAs -Source $mediumIcon.FullName -Destination (Join-Path $publicPath "admin-apple-touch-icon.png") -Width 180 -Height 180
Copy-ImageAs -Source $largeIcon.FullName -Destination (Join-Path $publicPath "admin-icon-512x512.png") -Width 512 -Height 512

Write-Host ""
Write-Host "Admin icons setup complete!" -ForegroundColor Green
Write-Host "Files created in: $publicPath" -ForegroundColor Cyan
Write-Host "  - admin-icon-192x192.png" -ForegroundColor Gray
Write-Host "  - admin-icon-512x512.png" -ForegroundColor Gray
Write-Host "  - admin-apple-touch-icon.png" -ForegroundColor Gray
