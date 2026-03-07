# Setup Inverted Favicons Script
# Finds inverted favicon files and sets them up for admin PWA

# Check multiple possible locations
$possiblePaths = @("Logo", "public/logo", "logo")
$logoPath = $null

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $invertedFiles = Get-ChildItem -Path $path -File -Force -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -match 'inverted' -and $_.Extension -match '\.(png|ico|svg|jpg|jpeg)$'
        }
        if ($invertedFiles.Count -gt 0) {
            $logoPath = $path
            break
        }
    }
}

$publicPath = "public"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Inverted Favicon Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $logoPath) {
    Write-Host "Could not find inverted favicon files!" -ForegroundColor Red
    Write-Host "Searched in: Logo, public/logo, logo" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found inverted favicons in: $logoPath" -ForegroundColor Green
Write-Host ""

# Find all files with "inverted" in the name
$invertedFiles = Get-ChildItem -Path $logoPath -File -Force | Where-Object {
    $_.Name -match 'inverted' -and $_.Extension -match '\.(png|ico|svg|jpg|jpeg)$'
} | Sort-Object Name

Write-Host "Looking for inverted favicon files in: $logoPath" -ForegroundColor Yellow
Write-Host ""

if ($invertedFiles.Count -eq 0) {
    Write-Host "No files with 'inverted' in the name found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "All files in $logoPath :" -ForegroundColor Yellow
    Get-ChildItem -Path $logoPath -File | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Please ensure your inverted favicon files are named like:" -ForegroundColor Yellow
    Write-Host "  - inverted-180x180.png" -ForegroundColor Gray
    Write-Host "  - inverted-192x192.png" -ForegroundColor Gray
    Write-Host "  - inverted-512x512.png" -ForegroundColor Gray
    Write-Host "  Or: inverted180x180.png, inverted_180x180.png, etc." -ForegroundColor Gray
    exit 1
}

Write-Host "Found $($invertedFiles.Count) inverted favicon file(s):" -ForegroundColor Green
foreach ($file in $invertedFiles) {
    $sizeKB = [math]::Round($file.Length / 1KB, 2)
    Write-Host "  - $($file.Name) ($sizeKB KB)" -ForegroundColor White
}
Write-Host ""

# Extract size from filename and match to target sizes
$targetSizes = @(
    @{ Size = 180; Target = "admin-apple-touch-icon.png"; Pattern = "180" },
    @{ Size = 192; Target = "admin-icon-192x192.png"; Pattern = "192" },
    @{ Size = 512; Target = "admin-icon-512x512.png"; Pattern = "512" }
)

Write-Host "Mapping files to admin icon sizes:" -ForegroundColor Cyan
Write-Host ""

$mappings = @{}

foreach ($target in $targetSizes) {
    # Try to find exact match first
    $matchedFile = $invertedFiles | Where-Object {
        $name = $_.BaseName.ToLower()
        $name -match $target.Pattern
    } | Select-Object -First 1
    
    if ($matchedFile) {
        $mappings[$target.Target] = $matchedFile
        Write-Host "  $($target.Target) <- $($matchedFile.Name)" -ForegroundColor Green
    } else {
        # If no exact match, use the first available file
        if ($invertedFiles.Count -gt 0) {
            $mappings[$target.Target] = $invertedFiles[0]
            Write-Host "  $($target.Target) <- $($invertedFiles[0].Name) (reused)" -ForegroundColor Yellow
        }
    }
}

if ($mappings.Count -eq 0) {
    Write-Host "Could not map any files!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Copying files..." -ForegroundColor Cyan
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
                Write-Host "    Note: Install ImageMagick for auto-resizing to ${Width}x${Height}" -ForegroundColor Yellow
            }
        }
        return $true
    } catch {
        Write-Host "  Failed: $_" -ForegroundColor Red
        return $false
    }
}

$success = $true

# Copy files to their target locations
foreach ($target in $targetSizes) {
    if ($mappings.ContainsKey($target.Target)) {
        $sourceFile = $mappings[$target.Target]
        $destPath = Join-Path $publicPath $target.Target
        $result = Copy-ImageAs -Source $sourceFile.FullName -Destination $destPath -Width $target.Size -Height $target.Size
        $success = $success -and $result
    }
}

Write-Host ""
if ($success) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Inverted favicons setup complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created in: $publicPath" -ForegroundColor Cyan
    Write-Host "  - admin-icon-192x192.png" -ForegroundColor Gray
    Write-Host "  - admin-icon-512x512.png" -ForegroundColor Gray
    Write-Host "  - admin-apple-touch-icon.png" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Clear your browser cache (Ctrl+Shift+R)" -ForegroundColor White
    Write-Host "  2. Navigate to /admin to see the new favicon" -ForegroundColor White
} else {
    Write-Host "Some files failed to create. Please check the errors above." -ForegroundColor Red
}

Write-Host ""

