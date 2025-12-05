# Service Worker 500 Error After Hard Refresh - Fix

## Problem

**Error**: 500 Internal Server Error after hard refresh

**Root Cause**: The dev server was still running when the `.next` cache was cleared, causing it to reference missing compiled files.

## Solution

### Step 1: Stop the Dev Server

If the dev server is running in a terminal:

- Press `Ctrl+C` to stop it
- Or close the terminal window

### Step 2: Kill Any Remaining Node Processes (Windows)

```powershell
taskkill /F /IM node.exe
```

This ensures all Node.js processes are stopped.

### Step 3: Restart the Dev Server

```bash
npm run dev
```

The server will:

- Rebuild all files from scratch
- Regenerate the `.next` directory
- Compile all components
- Start fresh without errors

## Why This Happens

1. **Cache Cleared While Server Running**: When you clear `.next` while the server is running, it still has references to old files in memory
2. **Stale Module References**: The server tries to load modules that no longer exist
3. **Hard Refresh**: Forces the browser to request fresh files, but the server is in a broken state

## Prevention

Always stop the dev server before clearing the cache:

1. Stop server (`Ctrl+C`)
2. Clear cache (`rm -rf .next` or `Remove-Item -Recurse -Force .next`)
3. Restart server (`npm run dev`)

## Service Worker Fix Applied

The service worker now skips webpack HMR files, which should prevent the warning. After restarting the server, the warning should be gone.
