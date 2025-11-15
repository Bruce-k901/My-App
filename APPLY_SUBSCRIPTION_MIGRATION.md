# Apply Subscription Migration - Quick Guide

## The Problem

The `company_subscriptions` table doesn't exist yet. You need to run the migration to create all the billing/subscription tables.

## Quick Fix - Run in Supabase SQL Editor

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Paste the Migration

1. Open the file: `supabase/migrations/20250201000000_create_subscription_schema.sql`
2. Copy **ALL** the contents (it's about 280 lines)
3. Paste into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify It Worked

Run this query to verify the tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscription_plans', 'company_subscriptions', 'invoices', 'data_export_requests')
ORDER BY table_name;
```

You should see all 4 tables listed.

### Step 4: Check Seed Data

Verify the subscription plans were seeded:

```sql
SELECT * FROM subscription_plans;
```

You should see 3 plans: Starter (£40), Pro (£55), Enterprise (£0).

---

## Alternative: Using Supabase CLI (if you have it set up)

```bash
# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

---

## After Migration

### Create Subscriptions for Existing Companies

Run this SQL to create trial subscriptions for all existing companies:

```sql
-- Create trial subscriptions for all existing companies
INSERT INTO company_subscriptions (company_id, plan_id, trial_started_at, trial_ends_at, trial_used, status, site_count)
SELECT
  c.id,
  (SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1),
  NOW(),
  NOW() + INTERVAL '60 days',
  true,
  'trial',
  (SELECT COUNT(*) FROM sites WHERE company_id = c.id)
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_subscriptions WHERE company_id = c.id
);
```

This will:

- Create a 60-day trial for each existing company
- Set them all to "starter" plan
- Calculate site count automatically
- Set trial end date to 60 days from now

---

## Troubleshooting

**Error: "relation already exists"**

- Some tables might already exist - that's okay, the migration uses `CREATE TABLE IF NOT EXISTS`
- Just continue - it won't break anything

**Error: "permission denied"**

- Make sure you're running as a database admin/superuser
- Check your Supabase project permissions

**Error: "column does not exist"**

- Make sure you ran the ENTIRE migration file
- Don't run it in parts - run it all at once

---

## What This Migration Creates

✅ **subscription_plans** - Pricing plans (Starter, Pro, Enterprise)  
✅ **company_subscriptions** - Company subscription tracking with 60-day trial  
✅ **invoices** - Manual invoice tracking  
✅ **data_export_requests** - GDPR data export requests

Plus:

- All indexes for performance
- RLS policies for security
- Triggers for automatic calculations
- Seed data for subscription plans

---

## Next Steps After Migration

1. ✅ Migration applied
2. ✅ Create subscriptions for existing companies (run the SQL above)
3. ✅ Test the billing page - should now load without errors
4. ✅ New companies will auto-get subscriptions (already hooked up)
