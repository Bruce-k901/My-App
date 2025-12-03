# Windows Build Cache Clear Guide

## Problem

On Windows PowerShell, the Unix command `rm -rf .next` doesn't work. You need to use PowerShell commands instead.

## Solution

### PowerShell Commands

```powershell
# Clear Next.js build cache
if (Test-Path .next) { Remove-Item -Recurse -Force .next }

# Stop all Node processes (if dev server is stuck)
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Restart dev server
npm run dev
```

### Command Prompt (Alternative)

```cmd
# Clear Next.js build cache
rmdir /s /q .next

# Restart dev server
npm run dev
```

## When to Clear Cache

Clear the `.next` directory when:

- ✅ Hydration errors persist after code fixes
- ✅ className mismatches between server and client
- ✅ Build errors that don't make sense
- ✅ After major dependency updates
- ✅ When Next.js lock file errors occur

## Quick Reference

### PowerShell One-Liner

```powershell
if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run dev
```

### With Process Cleanup

```powershell
if (Test-Path .next) { Remove-Item -Recurse -Force .next }; Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force; npm run dev
```

## Related Files

- `HYDRATION_FIXES_ROUND_2.md` - Hydration fix documentation
- `DASHBOARD_ERRORS_FIX.md` - Dashboard error fixes
- `src/app/dashboard/layout.tsx` - DashboardLayout component
