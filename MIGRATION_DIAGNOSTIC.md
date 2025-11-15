# Migration Diagnostic - Troubleshooting Guide

## Step 1: Check for Errors

Run this query to see if there were any errors during the migration:

```sql
-- Check for any existing tables (even partial)
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%subscription%' OR table_name LIKE '%invoice%' OR table_name LIKE '%export%'
ORDER BY table_name;
```

## Step 2: Check Current Schema

Run this to see what tables DO exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Step 3: Check if Companies Table Exists

The migration references `public.companies(id)`. Let's verify:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'companies'
);
```

If this returns `false`, that's the problem - the migration can't create foreign keys to a table that doesn't exist.

## Step 4: Run Migration in Parts

If the full migration failed, let's run it step by step to find where it breaks:

### Part 1: Create subscription_plans table only

```sql
-- Subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_per_site_monthly DECIMAL(10, 2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Then verify:**

```sql
SELECT * FROM subscription_plans;
```

### Part 2: Create company_subscriptions table

```sql
-- Company subscriptions table
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL,
  trial_used BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'past_due')),
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  billing_email TEXT,
  billing_address JSONB,
  payment_method TEXT DEFAULT 'manual_invoice',
  site_count INTEGER DEFAULT 0,
  monthly_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);
```

**Then verify:**

```sql
SELECT * FROM company_subscriptions LIMIT 1;
```

### Part 3: Create invoices table

```sql
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.company_subscriptions(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Part 4: Create data_export_requests table

```sql
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  export_type TEXT NOT NULL DEFAULT 'full' CHECK (export_type IN ('full', 'tasks', 'incidents', 'assets', 'sops')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  file_size_bytes BIGINT,
  expires_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Common Issues

### Issue 1: Companies table doesn't exist

**Error:** `relation "public.companies" does not exist`

**Solution:** The migration requires the `companies` table to exist first. Check if you have a companies table or if it's named differently.

### Issue 2: Permission denied

**Error:** `permission denied for schema public`

**Solution:** Make sure you're running as a database admin. In Supabase, use the SQL Editor with admin privileges.

### Issue 3: RLS policies conflict

**Error:** `policy already exists`

**Solution:** The migration uses `CREATE POLICY` without `IF NOT EXISTS`. If policies already exist, drop them first or modify the migration.

### Issue 4: Functions already exist

**Error:** `function already exists`

**Solution:** The migration uses `CREATE OR REPLACE FUNCTION` which should handle this, but if you get errors, drop the functions first:

```sql
DROP FUNCTION IF EXISTS set_trial_end_date() CASCADE;
DROP FUNCTION IF EXISTS update_subscription_status() CASCADE;
DROP FUNCTION IF EXISTS calculate_monthly_amount() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

## Quick Fix: Drop Everything and Start Fresh

If you want to start completely fresh (⚠️ **WARNING: This deletes all subscription data**):

```sql
-- Drop in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS public.data_export_requests CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.company_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS set_trial_end_date() CASCADE;
DROP FUNCTION IF EXISTS update_subscription_status() CASCADE;
DROP FUNCTION IF EXISTS calculate_monthly_amount() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

Then run the full migration again.
