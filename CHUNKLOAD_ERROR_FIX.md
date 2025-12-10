# ChunkLoadError Fix Guide

## Error

```
Loading chunk app/layout failed.
(timeout: http://localhost:3000/_next/static/chunks/app/layout.js)
```

## Root Cause

This error occurs when Next.js cannot load the compiled layout chunk. Common causes:

1. Build cache corruption
2. Dev server not running properly
3. Port conflicts
4. Syntax errors in source code (FIXED)

## Fixes Applied

### 1. Fixed Syntax Errors in layout.tsx

- Fixed operator precedence issue on line 184
- Fixed operator precedence issue on line 90
- Both issues were in the template string JavaScript code

### 2. Cleared Build Cache

- Removed `.next` directory to force fresh build

## Steps to Resolve

### Step 1: Stop All Node Processes

```powershell
# Kill all Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Clear All Caches

```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Clear npm cache (optional)
npm cache clean --force
```

### Step 3: Reinstall Dependencies (if needed)

```powershell
# Only if Step 2 doesn't work
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

### Step 4: Start Fresh Dev Server

```powershell
npm run dev
```

### Step 5: Clear Browser Cache

- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"
- Or use Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

## Alternative: Use Different Port

If port 3000 is causing issues:

```powershell
# Set port in package.json or use:
$env:PORT=3001; npm run dev
```

Or modify `package.json`:

```json
{
  "scripts": {
    "dev": "next dev --webpack -p 3001"
  }
}
```

## Verify Fix

1. Check dev server starts without errors
2. Open http://localhost:3000 (or your port)
3. Check browser console - should see no ChunkLoadError
4. Verify layout loads correctly

## If Still Failing

1. Check for other syntax errors:

   ```powershell
   npm run lint
   ```

2. Try production build:

   ```powershell
   npm run build
   npm start
   ```

3. Check Next.js version compatibility:

   ```powershell
   npm list next react react-dom
   ```

4. Check for port conflicts:
   ```powershell
   netstat -ano | findstr :3000
   ```
