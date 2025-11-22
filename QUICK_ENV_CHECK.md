# Quick Environment Variable Check

Since the `/api/debug/env` endpoint isn't accessible yet, here are alternative ways to check:

## Option 1: Browser Console (Easiest)

1. Open your app: `https://my-app-zeta-murex.vercel.app`
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Look for this log:
   ```
   🔍 VAPID Key Debug (client-side): { ... }
   ```
5. This shows:
   - `exists`: true/false
   - `length`: Should be 87 for VAPID key
   - `allNextPublicVars`: List of all NEXT*PUBLIC*\* variables

## Option 2: Try Alternative Debug Endpoint

Try this endpoint instead:

```
https://my-app-zeta-murex.vercel.app/api/debug-env
```

## Option 3: Check Vercel Build Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your project
3. Go to **Deployments** tab
4. Click on your latest deployment
5. Click **"View Build Logs"**
6. Search for: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
7. Look for any warnings about environment variables

## Option 4: Verify in Vercel Dashboard

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. For each variable, check:
   - **Name** is exactly correct (no typos)
   - **Value** is set (not empty)
   - **Environments** - ALL three are checked:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

## Most Likely Issue

If both variables are set but not working, it's almost always:

**Environment Mismatch:**

- Variables set for Production only
- But you're testing on Preview deployment
- Or vice versa

**Solution:** Make sure ALL environments are selected for BOTH variables.

## After Checking

Share what you find:

1. What the browser console shows for VAPID key
2. Which environments are selected in Vercel
3. Any errors from Vercel build logs
