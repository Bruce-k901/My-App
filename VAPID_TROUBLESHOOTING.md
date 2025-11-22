# VAPID Key Troubleshooting Guide

## Current Issue

The VAPID key is not being embedded at build time, even though it's set in Vercel.

## Step 1: Verify Server-Side Availability

After deployment, visit:

```
https://your-app.vercel.app/api/debug/env
```

This will show:

- Whether the variable exists on the server
- All `NEXT_PUBLIC_*` variables available
- The environment (Production/Preview/Development)

**If the variable shows "NOT SET" here:**

- The variable is not set in Vercel for the current environment
- Check which environment you're testing (Production vs Preview)

## Step 2: Check Vercel Build Logs

1. Go to Vercel Dashboard → Deployments
2. Click on your latest deployment
3. Click "View Build Logs"
4. Search for: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
5. Look for any warnings or errors

**What to look for:**

- Warnings about missing environment variables
- Errors during the build process
- Confirmation that env vars were loaded

## Step 3: Verify Environment Selection

**Critical:** The variable must be set for the environment you're testing:

1. Go to Vercel → Settings → Environment Variables
2. Find `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
3. Click Edit
4. **Verify ALL three are checked:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

**Common mistake:** Only Production is checked, but you're testing on a Preview deployment.

## Step 4: Check for Typos

The variable name must be **exactly** (case-sensitive, no spaces):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY
```

**Common typos:**

- `NEXT_PUBLIC_VAPID_KEY` (missing `_PUBLIC`)
- `NEXTPUBLIC_VAPID_PUBLIC_KEY` (missing underscore)
- `next_public_vapid_public_key` (wrong case)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY ` (trailing space)

## Step 5: Verify Value Format

The value should be exactly (no quotes, no spaces, no line breaks):

```
BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk
```

**Common mistakes:**

- Added quotes: `"BDrNyYQVW6601..."`
- Extra spaces: `BDrNyYQVW6601...` (spaces before/after)
- Line breaks in the value
- Wrong characters (typos in the key itself)

## Step 6: Force a Clean Redeploy

Sometimes Vercel caches the build. Try:

1. **Delete and Re-add the Variable:**
   - Delete `NEXT_PUBLIC_VAPID_PUBLIC_KEY` from Vercel
   - Save
   - Add it back with the exact name and value
   - Save again
   - Redeploy

2. **Clear Build Cache:**
   - Go to Vercel → Settings → General
   - Look for "Clear Build Cache" option
   - Or trigger a new deployment

3. **Redeploy from Git:**
   ```bash
   git commit --allow-empty -m "trigger: force redeploy for VAPID key"
   git push
   ```

## Step 7: Compare with Working Variables

Since `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` work, compare:

1. Check if they're set for the same environments
2. Check if they have the same format (no quotes, no spaces)
3. Check if they were added at the same time

## Step 8: Check Browser Console

After redeployment, check the browser console for:

```
🔍 VAPID Key Debug (client-side): { ... }
```

This will show:

- `exists`: true/false
- `length`: Should be 87
- `allNextPublicVars`: List of all NEXT*PUBLIC*\* variables

**If `exists: false`:**

- The variable is not embedded in the build
- Check steps 1-7 above

## Step 9: Verify in Built JavaScript

If still not working, check the actual built JavaScript:

1. Open your deployed site
2. Open browser DevTools → Network tab
3. Reload the page
4. Find the main JavaScript bundle (usually `_app-*.js` or similar)
5. Open it and search for: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
6. If found, check if the value is embedded
7. If not found, the variable wasn't available at build time

## Most Likely Causes (in order)

1. **Variable only set for Production, testing on Preview** (90% of cases)
2. **Typo in variable name** (5% of cases)
3. **Extra characters in value** (quotes, spaces) (3% of cases)
4. **Build cache issue** (2% of cases)

## Still Not Working?

If after all these steps it's still not working:

1. Share the output from `/api/debug/env`
2. Share a screenshot of your Vercel Environment Variables page
3. Share the relevant section of your Vercel build logs
4. Share the browser console output showing the VAPID debug info
