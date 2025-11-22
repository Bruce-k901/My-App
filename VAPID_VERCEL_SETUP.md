# VAPID Key Setup for Vercel

## ⚠️ Critical: NEXT*PUBLIC*\* Variables Are Build-Time

Environment variables prefixed with `NEXT_PUBLIC_` are embedded into your JavaScript bundle **at build time**, not runtime. This means:

1. ✅ You must add the variable to Vercel **BEFORE** deploying
2. ✅ You **MUST redeploy** after adding the variable
3. ❌ Just adding it to Vercel settings won't work until you redeploy

## Step-by-Step Setup

### 1. Add Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Add the following:

   **Name:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

   **Value:** `BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk`

   **Environment:** Select all (Production, Preview, Development)

5. Click **"Save"**

### 2. Redeploy Your Application

**This is critical!** After adding the environment variable, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **"..."** menu on your latest deployment
3. Click **"Redeploy"**
4. Wait for the deployment to complete

**OR** trigger a new deployment by:

- Pushing a new commit to your repository
- Using Vercel CLI: `vercel --prod`

### 3. Verify the Variable is Available

After redeployment, check the browser console. You should see:

- ✅ No "VAPID public key is missing" error
- ✅ Push notifications should work

If you still see the error:

1. Check that the variable name is exactly `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (case-sensitive)
2. Check that the value matches exactly (no extra spaces, quotes, or line breaks)
3. Verify you selected all environments (Production, Preview, Development)
4. Make sure you redeployed after adding the variable

## Common Mistakes

### ❌ Wrong Variable Name

- `VAPID_PUBLIC_KEY` (missing `NEXT_PUBLIC_` prefix)
- `NEXT_PUBLIC_VAPID_KEY` (wrong name)
- `vapid_public_key` (wrong case)

### ❌ Forgot to Redeploy

- Added variable but didn't redeploy
- Variable exists in settings but not in the build

### ❌ Wrong Environment Selected

- Only added to Production but testing on Preview
- Forgot to select all environments

### ❌ Extra Characters

- Added quotes around the value: `"BDrNyYQVW6601..."`
- Added spaces before/after the value
- Added line breaks in the value

## Verification Checklist

- [ ] Variable name is exactly: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- [ ] Value is exactly: `BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk`
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Redeployed after adding the variable
- [ ] No error in browser console
- [ ] Push notifications work

## Testing

After redeployment, open your browser console and check:

1. No "VAPID public key is missing" error
2. Try to enable push notifications in your app
3. Should work without errors

## Still Having Issues?

1. **Check Vercel Build Logs:**
   - Go to your deployment
   - Click "View Function Logs"
   - Look for any environment variable warnings

2. **Verify in Browser:**
   - Open browser console
   - Type: `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - Should show the key value (not undefined)

3. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear cache and reload

4. **Check Deployment:**
   - Make sure the deployment completed successfully
   - Check that the environment variable shows in the deployment settings
