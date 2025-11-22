# How to Find Your Vercel URL

## Quick Steps

### Option 1: From Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and log in
2. Click on your project
3. Look at the top of the page - you'll see your deployment URL
4. It will look like one of these:
   - `your-project-name.vercel.app` (Production)
   - `your-project-name-git-branch-name.vercel.app` (Preview)
   - `your-project-name-username.vercel.app` (Development)

### Option 2: From Your Browser

1. Open your deployed app in a browser
2. Look at the address bar
3. Copy the domain (everything before the first `/`)

### Option 3: Check Your Git Repository

If you have a `vercel.json` or deployment config, it might have the domain listed.

## Using the Debug Endpoint

Once you have your URL, visit:

```
https://YOUR-ACTUAL-URL.vercel.app/api/debug/env
```

**Example:**

- If your URL is `my-app.vercel.app`, visit: `https://my-app.vercel.app/api/debug/env`
- If your URL is `my-app-git-main.vercel.app`, visit: `https://my-app-git-main.vercel.app/api/debug/env`

## Alternative: Check Browser Console

If you can't access the endpoint, you can also check the browser console:

1. Open your app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for the `🔍 VAPID Key Debug` log
5. This shows client-side environment variables

## What You'll See

The debug endpoint will show:

- Which environment you're on (Production/Preview/Development)
- Whether `NEXT_PUBLIC_VAPID_PUBLIC_KEY` exists
- Whether `SUPABASE_SERVICE_ROLE_KEY` exists
- All `NEXT_PUBLIC_*` variables
- Any detected issues

## Still Can't Find It?

1. Check your Vercel dashboard → Project → Settings → Domains
2. Or check your email for Vercel deployment notifications
3. Or look at your Git repository's deployment settings
