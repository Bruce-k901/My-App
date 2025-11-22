# Add SUPABASE_SERVICE_ROLE_KEY to Vercel

## The Issue

You're seeing this error in the logs:

```
Failed to initialize Supabase admin client: Error: Supabase service role key is not configured (SUPABASE_SERVICE_ROLE_KEY)
```

This means `SUPABASE_SERVICE_ROLE_KEY` is not set in your Vercel environment variables.

## Quick Fix

### Step 1: Get Your Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Find the **"service_role"** key (NOT the anon key)
5. Copy it - it should start with `eyJ...` (not `sb_publishable_`)

⚠️ **Important:** This is the **service_role** key, not the anon/public key. It's a secret key that bypasses Row Level Security.

### Step 2: Add to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Enter:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Paste your service_role key (starts with `eyJ...`)
   - **Environments:** Select ALL three:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
5. Click **"Save"**

### Step 3: Redeploy

After adding the variable, you need to redeploy:

1. Go to **Deployments** tab
2. Click **"..."** on your latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

**OR** trigger a new deployment:

```bash
git commit --allow-empty -m "trigger: redeploy for service role key"
git push
```

## Verify It's Working

After redeployment, check:

1. The error should be gone from the logs
2. The `/api/compliance/summary` endpoint should work
3. Visit `/api/debug/env` to verify the variable is set

## Security Note

⚠️ **Never commit this key to git!** It's a secret key that has full database access. Only add it to Vercel environment variables.

## Common Mistakes

- ❌ Using the anon key instead of service_role key
- ❌ Using a key that starts with `sb_publishable_` (that's the publishable anon key)
- ❌ Only setting it for Production (forgot Preview/Development)
- ❌ Adding quotes around the value
- ❌ Adding extra spaces

## Expected Value Format

The service_role key should:

- Start with `eyJ...` (JWT format)
- Be very long (hundreds of characters)
- NOT start with `sb_publishable_`
