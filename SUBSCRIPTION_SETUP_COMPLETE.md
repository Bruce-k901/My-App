# ✅ Subscription System Setup Complete!

## What Was Done

1. ✅ **Migration Applied** - All 4 tables created successfully:
   - `subscription_plans` - Pricing plans (Starter, Pro, Enterprise)
   - `company_subscriptions` - Company subscription tracking
   - `invoices` - Manual invoice tracking
   - `data_export_requests` - GDPR data export requests

2. ✅ **Database Schema** - Complete with:
   - Indexes for performance
   - RLS policies for security
   - Triggers for automatic calculations
   - Functions for business logic

3. ✅ **Seed Data** - Subscription plans seeded:
   - Starter: £40/month per site
   - Pro: £55/month per site
   - Enterprise: Custom pricing

4. ✅ **Billing Page** - Updated to:
   - Call the API route for actual data export (downloads JSON)
   - Display subscription status and trial countdown
   - Show invoice history
   - Request data exports

## Next Steps

### 1. Create Trial Subscriptions for Existing Companies

Run this SQL in Supabase SQL Editor:

```sql
-- File: CREATE_TRIAL_SUBSCRIPTIONS.sql
```

Or run directly:

```sql
INSERT INTO company_subscriptions (
  company_id,
  plan_id,
  trial_started_at,
  trial_ends_at,
  trial_used,
  status,
  site_count
)
SELECT
  c.id AS company_id,
  (SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1) AS plan_id,
  COALESCE(c.created_at, NOW()) AS trial_started_at,
  COALESCE(c.created_at, NOW()) + INTERVAL '60 days' AS trial_ends_at,
  true AS trial_used,
  'trial' AS status,
  (SELECT COUNT(*) FROM sites WHERE company_id = c.id) AS site_count
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_subscriptions WHERE company_id = c.id
);
```

### 2. Verify Everything Works

Run the verification queries:

```sql
-- File: VERIFY_SUBSCRIPTION_SETUP.sql
```

Or check manually:

```sql
-- Check subscriptions exist
SELECT
  c.name AS company_name,
  sp.display_name AS plan_name,
  cs.status,
  cs.trial_ends_at,
  cs.site_count
FROM company_subscriptions cs
JOIN companies c ON c.id = cs.company_id
JOIN subscription_plans sp ON sp.id = cs.plan_id;
```

### 3. Test the Billing Page

1. Navigate to `/dashboard/billing`
2. Should see:
   - Current subscription status
   - Trial countdown (if in trial)
   - Site count and monthly amount
   - Invoice history (empty initially)
   - Data export button

### 4. Test Data Export

1. Click "Request Full Data Export" on the billing page
2. Should download a JSON file with all company data
3. Check the file contains:
   - Tasks
   - Incidents
   - Assets
   - SOPs
   - Temperature logs
   - Libraries

## What's Already Hooked Up

✅ **New Company Signup** - Automatically creates 60-day trial subscription  
✅ **Site Creation/Deletion** - Automatically updates subscription site count  
✅ **Billing Page** - Displays subscription info and allows data export  
✅ **Terms Page** - Updated with trial, invoicing, and cancellation terms

## What's Not Hooked Up Yet

⏳ **Invoice Generation** - Manual process for now  
⏳ **Trial Expiration** - Need to add cron job or Edge Function to check expired trials  
⏳ **Subscription Cancellation** - Need to add UI for 60-day notice cancellation  
⏳ **Payment Processing** - Manual invoicing only (no Stripe yet)

## Files Created

- `supabase/migrations/20250201000000_create_subscription_schema.sql` - Main migration
- `MIGRATION_STEP_BY_STEP.sql` - Step-by-step migration guide
- `VERIFY_SUBSCRIPTION_SETUP.sql` - Verification queries
- `CREATE_TRIAL_SUBSCRIPTIONS.sql` - Create subscriptions for existing companies
- `src/lib/subscriptions.ts` - Subscription utility functions
- `src/app/dashboard/billing/page.tsx` - Billing page UI
- `src/app/api/billing/export/route.ts` - Data export API route

## Troubleshooting

**Issue: "Could not find the table 'public.company_subscriptions'"**

- ✅ Fixed - Migration has been applied

**Issue: "No subscription found"**

- Run `CREATE_TRIAL_SUBSCRIPTIONS.sql` to create subscriptions for existing companies

**Issue: "Data export fails"**

- Check that the API route is accessible
- Verify user is authenticated
- Check browser console for errors

---

**Status: ✅ Ready to Use!**

The billing system is now functional. New companies will automatically get trial subscriptions, and existing companies can have subscriptions created using the SQL script above.
