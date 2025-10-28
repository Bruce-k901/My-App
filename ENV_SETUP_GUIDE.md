# Environment Variables Setup Guide

## Current Status

**No `.env.local` file found** - You need to create this file to configure Supabase.

## Required Environment Variables

Your application requires these Supabase environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## How to Get Your Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Creating Your .env.local File

### Option 1: Create Manually

1. Create a new file called `.env.local` in the project root
2. Add the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace `your-project.supabase.co` and `your-anon-key-here` with your actual values
4. Save the file

### Option 2: Use PowerShell

```powershell
# Create .env.local file
@"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
"@ | Out-File -FilePath .env.local -Encoding utf8
```

Then edit `.env.local` with your actual values.

## Restart Development Server

After creating/updating `.env.local`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Production Deployment (Vercel)

For production deployments on Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
4. Redeploy your application

## Verification

After setting up environment variables, verify they're working:

1. Start your development server: `npm run dev`
2. Open the application in your browser
3. Check the browser console for any Supabase connection errors
4. Try logging in or accessing Supabase-dependent features

## Troubleshooting

### "Missing required environment variables" Error

- Ensure `.env.local` exists in the project root
- Ensure variables are prefixed with `NEXT_PUBLIC_`
- Restart the development server after making changes
- Check for typos in variable names

### Variables Not Loading

- Environment variables require a server restart to take effect
- Ensure `.env.local` is not in `.gitignore` conflicts
- Check that you're using the correct variable names (case-sensitive)

### Production Issues

- Ensure environment variables are set in Vercel dashboard
- Use Vercel CLI to verify: `vercel env ls`
- Redeploy after adding new environment variables

## Security Notes

⚠️ **Important**: 
- Never commit `.env.local` to version control (it's already in `.gitignore`)
- Never share your Supabase credentials publicly
- The `anon` key is safe for client-side use
- Keep the `service_role` key secret (never expose in client-side code)

