Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RepoRoot = $null

function Get-RepoRoot {
  if ($script:RepoRoot) { return $script:RepoRoot }
  try {
    $root = git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $root) { $script:RepoRoot = $root.Trim(); return $script:RepoRoot }
  } catch {}
  $here = Get-Location
  $dir = $here
  while ($dir.Path -and -not (Test-Path (Join-Path $dir ".git"))) {
    if (Test-Path (Join-Path $dir "package.json")) { break }
    $parent = $dir | Split-Path -Parent
    if ($parent -eq $dir.Path) { break }
    $dir = Get-Item $parent
  }
  $script:RepoRoot = $dir.Path
  return $script:RepoRoot
}

function Enter-RepoRoot {
  $root = Get-RepoRoot
  if (-not $root) { throw "Repo root not found" }
  Set-Location $root
}

function Stop-DevWatchers {
  Get-Process | Where-Object { $_.Name -match 'node|next|vite|tsx|npm|pnpm' } | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 300
}

function New-DirFast {
  param([Parameter(Mandatory)][string]$Path)
  $full = Join-Path (Get-RepoRoot) $Path
  if (-not (Test-Path $full)) {
    New-Item -ItemType Directory -Path $full -Force | Out-Null
  }
}

function Test-FileUnlocked {
  param([Parameter(Mandatory)][string]$FullPath)
  if (-not (Test-Path $FullPath)) { return $true }
  try {
    $fs = [System.IO.File]::Open($FullPath, 'Open', 'ReadWrite', 'None')
    $fs.Close()
    return $true
  } catch { return $false }
}

function Wait-FileUnlock {
  param(
    [Parameter(Mandatory)][string]$FullPath,
    [int]$TimeoutSec = 10
  )
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    if (Test-FileUnlocked -FullPath $FullPath) { return $true }
    Start-Sleep -Milliseconds 150
  }
  throw "Timeout waiting for unlock: $FullPath"
}

function Get-HashSafe {
  param([Parameter(Mandatory)][string]$FullPath)
  if (-not (Test-Path $FullPath)) { return $null }
  return (Get-FileHash -Algorithm SHA256 -Path $FullPath).Hash
}

function Copy-FileRobust {
  param(
    [Parameter(Mandatory)][string]$From,
    [Parameter(Mandatory)][string]$To,
    [int]$Retries = 3
  )
  Enter-RepoRoot
  $src = Join-Path (Get-RepoRoot) $From
  $dst = Join-Path (Get-RepoRoot) $To
  $dstDir = Split-Path $dst -Parent
  if (-not (Test-Path $src)) { throw "Source not found: $src" }
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }

  $srcHash = Get-HashSafe $src
  for ($i=1; $i -le $Retries; $i++) {
    Wait-FileUnlock -FullPath $dst -TimeoutSec 5 | Out-Null
    try {
      $rc = Start-Process -FilePath robocopy -ArgumentList "`"$([IO.Path]::GetDirectoryName($src))`" `"$dstDir`" `"$([IO.Path]::GetFileName($src))`" /NFL /NDL /NJH /NJS /NC /NS /R:2 /W:1 /XO" -NoNewWindow -PassThru -Wait
      if ($rc.ExitCode -lt 8) {
        $dstHash = Get-HashSafe $dst
        if ($srcHash -and $dstHash -and $srcHash -eq $dstHash) { return $true }
        Copy-Item -LiteralPath $src -Destination $dst -Force
        $dstHash = Get-HashSafe $dst
        if ($srcHash -eq $dstHash) { return $true }
      }
      Start-Sleep -Milliseconds (200 * $i)
    } catch {
      if ($i -eq $Retries) { throw $_ }
      Start-Sleep -Milliseconds (200 * $i)
    }
  }
  throw "Failed to copy after $Retries attempts: $src -> $dst"
}

function Publish-Lotties {
  param(
    [string[]]$Names = @(
      "danger_zone_dial.json",
      "storage_hierarchy.json",
      "cleaning_cycle.json",
      "cross_contact.json",
      "handwash_steps.json"
    ),
    [string]$SourceDir = "public/lottie_v2_tmp/lottie",
    [string]$TargetDir = "public/lottie"
  )
  Enter-RepoRoot
  New-DirFast -Path $TargetDir
  foreach ($n in $Names) {
    Copy-FileRobust -From (Join-Path $SourceDir $n) -To (Join-Path $TargetDir $n)
  }
  "Lotties published."
}

function Ensure-CourseScaffold {
  param([string]$Module = "m3")
  Enter-RepoRoot
  $paths = @(
    "courses/uk-l2-food-hygiene/modules/$Module",
    "courses/uk-l2-food-hygiene/modules/$Module/media",
    "courses/uk-l2-food-hygiene/modules/$Module/media/images",
    "courses/uk-l2-food-hygiene/modules/$Module/media/lottie"
  )
  foreach ($p in $paths) { New-DirFast -Path $p }
  "Scaffold ready for $Module."
}

function Fix-StuckIO {
  Stop-DevWatchers
  "Watchers stopped. Try again."
}
