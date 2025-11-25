$ErrorActionPreference = "Stop"

Write-Host "Fetching latest Stripe CLI release info..."
try {
    $latestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/stripe/stripe-cli/releases/latest"
    $downloadUrl = $latestRelease.assets | Where-Object { $_.name -like "*windows_x86_64.zip" } | Select-Object -ExpandProperty browser_download_url
    
    if (-not $downloadUrl) {
        throw "Could not find Windows download URL in latest release."
    }

    $zipFile = "stripe_cli.zip"
    $destDir = "stripe_cli"

    Write-Host "Downloading Stripe CLI from $downloadUrl..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile

    Write-Host "Extracting to $destDir..."
    if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force }
    Expand-Archive -Path $zipFile -DestinationPath $destDir -Force

    Remove-Item $zipFile

    $stripePath = Join-Path (Get-Location) "$destDir\stripe.exe"
    Write-Host "✅ Stripe CLI installed successfully!"
    Write-Host "Executable location: $stripePath"
    Write-Host ""
    Write-Host "To login, run:"
    Write-Host "  .\$destDir\stripe.exe login"
    Write-Host ""
    Write-Host "To listen for webhooks, run:"
    Write-Host "  .\$destDir\stripe.exe listen --forward-to http://localhost:3000/api/billing/stripe/webhook"
}
catch {
    Write-Error "Failed to install Stripe CLI: $_"
}
