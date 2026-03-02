# Quick Theme Audit - finds files needing updates
$path = ".\src"

Write-Host "Scanning for theme issues..." -ForegroundColor Cyan

Write-Host "`n🔴 Files with dark-mode-only backgrounds:" -ForegroundColor Red
Get-ChildItem -Path $path -Recurse -Include "*.tsx" | Select-String -Pattern 'bg-\[#0f1220\]|bg-\[#171b2d\]' | Select-Object -ExpandProperty Path -Unique | ForEach-Object { Write-Host "  $_" }

Write-Host "`n🔴 Files with text-white (no dark: prefix):" -ForegroundColor Red
Get-ChildItem -Path $path -Recurse -Include "*.tsx" | Select-String -Pattern 'text-white[^/]' | Select-Object -ExpandProperty Path -Unique | ForEach-Object { Write-Host "  $_" }

Write-Host "`n🟠 Files with washed-out opacity backgrounds:" -ForegroundColor Yellow
Get-ChildItem -Path $path -Recurse -Include "*.tsx" | Select-String -Pattern 'bg-(blue|yellow|amber|green|red|pink)-500/10' | Select-Object -ExpandProperty Path -Unique | ForEach-Object { Write-Host "  $_" }

Write-Host "`nDone!" -ForegroundColor Green
