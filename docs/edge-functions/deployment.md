# Edge Function Deployment Guide

## ⚠️ IMPORTANT: This is NOT SQL!

**Edge Functions are TypeScript/JavaScript files that run in Deno runtime**, NOT SQL queries. You cannot run them in the SQL Editor.

## What is an Edge Function?

- **Type**: TypeScript/JavaScript code
- **Runtime**: Deno (Supabase's serverless runtime)
- **Location**: `supabase/functions/generate-daily-tasks/index.ts`
- **Purpose**: Generates tasks automatically by calling Supabase APIs

## How to Deploy

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd c:\Users\bruce\my-app

# Deploy the function
supabase functions deploy generate-daily-tasks
```

### Option 2: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **"Create a new function"** or find `generate-daily-tasks`
3. Copy the contents of `supabase/functions/generate-daily-tasks/index.ts`
4. Paste into the editor
5. Click **"Deploy"**

## How to Test

### Via API Call:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-daily-tasks \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Via Next.js API Route:

```bash
curl -X POST http://localhost:3000/api/admin/generate-tasks \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Setting Up the Schedule

After deploying, set up the schedule in Supabase Dashboard:

1. Go to **Edge Functions** → **generate-daily-tasks**
2. Click **"Schedule"** or **"Add Schedule"**
3. Configure:
   - **Name**: `daily-task-generation`
   - **Cron Expression**: `0 3 * * *` (3:00 AM UTC every day)
   - **Authorization**: `Bearer YOUR_SERVICE_ROLE_KEY`
   - **Method**: `POST`
4. Click **"Save"**

## Common Errors

### Error: "syntax error at or near '{'"

**Cause**: Trying to run TypeScript code as SQL

**Solution**:

- ❌ Don't paste the Edge Function code into SQL Editor
- ✅ Deploy it as an Edge Function using CLI or Dashboard
- ✅ Edge Functions run in Deno runtime, not PostgreSQL

### Error: "Failed to run sql query"

**Cause**: Confusing Edge Functions with SQL functions

**Solution**:

- Edge Functions = TypeScript/Deno (in `supabase/functions/`)
- SQL Functions = PostgreSQL (in `supabase/migrations/`)
- These are completely different!

## What Changed

I updated the function to use the modern Deno API:

**Before:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req: Request) => { ... });
```

**After:**

```typescript
Deno.serve(async (req: Request) => { ... });
```

This is the recommended way for Supabase Edge Functions (Deno 2.x).

## Verification

After deploying, check:

1. **Function exists**: Dashboard → Edge Functions → `generate-daily-tasks`
2. **Schedule exists**: Dashboard → Edge Functions → `generate-daily-tasks` → Schedules
3. **Logs**: Dashboard → Edge Functions → `generate-daily-tasks` → Logs (after 3am UTC)

## Need Help?

- Edge Functions run in **Deno runtime** (TypeScript/JavaScript)
- SQL functions run in **PostgreSQL** (SQL/PLpgSQL)
- These are **completely separate systems**

If you need SQL-based task generation, use the database function `generate_daily_tasks_direct()` from the migration file instead.
