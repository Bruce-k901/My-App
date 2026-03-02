# Clear Next.js Cache and Restart Dev Server
# Run this script to fix the mobile burger menu issue

Write-Host "🧹 Clearing Next.js cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Write-Host "✅ Cache cleared!" -ForegroundColor Green

Write-Host "`n🔄 Restarting dev server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server when done testing" -ForegroundColor Cyan
npm run dev
