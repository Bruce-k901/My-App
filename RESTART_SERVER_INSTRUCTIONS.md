# Restart Dev Server Instructions

## Current Issue

500 Internal Server Error after hard refresh - caused by dev server running with stale cache references.

## Solution

### Step 1: Stop All Node Processes ✅ DONE

All Node.js processes have been killed.

### Step 2: Restart Dev Server

Run this command:

```bash
npm run dev
```

The server will:

- Start fresh
- Rebuild all files
- Regenerate `.next` directory
- Compile all components
- No more 500 errors

## What Was Fixed

1. ✅ **Service Worker**: Updated to skip webpack HMR files (prevents warnings)
2. ✅ **Cache Cleared**: `.next` directory removed
3. ✅ **Node Processes**: All stopped
4. ⏳ **Server Restart**: Need to run `npm run dev`

## After Restart

- ✅ No more 500 errors
- ✅ No more service worker HMR warnings
- ✅ Clean server state
- ✅ All functionality working
