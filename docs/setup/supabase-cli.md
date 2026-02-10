# Supabase CLI Setup Guide

## Installation

### Option 1: Using npm (Recommended for Windows)

```bash
npm install -g supabase
```

### Option 2: Using Scoop (Windows Package Manager)

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Option 3: Using Chocolatey (Windows)

```bash
choco install supabase
```

### Option 4: Direct Download (Windows)

1. Go to: https://github.com/supabase/cli/releases
2. Download `supabase_windows_amd64.zip` (or appropriate version)
3. Extract and add to your PATH

## Verify Installation

```bash
supabase --version
```

Should show something like: `supabase version 1.x.x`

## Login to Supabase

```bash
supabase login
```

This will:

1. Open your browser
2. Ask you to authorize the CLI
3. Save your access token locally

## Link Your Project

### Option 1: Link to Existing Project

```bash
# Navigate to your project directory
cd c:\Users\bruce\my-app

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your Project Ref:**

- Go to Supabase Dashboard
- Click on your project
- Go to Settings → General
- Copy the "Reference ID" (looks like: `xijoybubtrgbrhquqwrx`)

### Option 2: Initialize New Project (if starting fresh)

```bash
cd c:\Users\bruce\my-app
supabase init
```

## Set Up Environment Variables

Create or update `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**To find these values:**

- Go to Supabase Dashboard → Settings → API
- Copy the values

## Deploy Edge Functions

Once linked, you can deploy:

```bash
# Deploy a specific function
supabase functions deploy generate-daily-tasks

# Deploy all functions
supabase functions deploy
```

## Common Commands

### Database

```bash
# Push migrations to remote database
supabase db push

# Pull remote database schema
supabase db pull

# Reset local database
supabase db reset
```

### Edge Functions

```bash
# List all functions
supabase functions list

# Deploy a function
supabase functions deploy FUNCTION_NAME

# View function logs
supabase functions logs FUNCTION_NAME

# Test function locally
supabase functions serve FUNCTION_NAME
```

### Project Management

```bash
# Check project status
supabase status

# Link to project
supabase link --project-ref PROJECT_REF

# Unlink from project
supabase unlink
```

## Troubleshooting

### "Command not found" after installation

**Windows:**

- Restart your terminal/PowerShell
- Make sure npm global bin is in your PATH:
  ```bash
  npm config get prefix
  ```
- Add that path to your system PATH environment variable

### "Not logged in" error

```bash
supabase login
```

### "Project not linked" error

```bash
cd c:\Users\bruce\my-app
supabase link --project-ref YOUR_PROJECT_REF
```

### "Permission denied" errors

Make sure you're using the correct service role key in your environment variables.

## Quick Start for Your Project

1. **Install CLI:**

   ```bash
   npm install -g supabase
   ```

2. **Login:**

   ```bash
   supabase login
   ```

3. **Link your project:**

   ```bash
   cd c:\Users\bruce\my-app
   supabase link --project-ref xijoybubtrgbrhquqwrx
   ```

   (Replace with your actual project ref)

4. **Deploy the Edge Function:**

   ```bash
   supabase functions deploy generate-daily-tasks
   ```

5. **Verify:**
   - Check Supabase Dashboard → Edge Functions
   - Should see `generate-daily-tasks` listed

## Alternative: Use Supabase Dashboard

If you prefer not to use CLI, you can:

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create a new function" or edit existing
3. Copy/paste the code from `supabase/functions/generate-daily-tasks/index.ts`
4. Click "Deploy"

The CLI is faster for repeated deployments, but Dashboard works fine for one-time setup.
