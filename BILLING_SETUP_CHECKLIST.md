# Billing System Setup - Quick Start Checklist

## ✅ What's Been Completed

- [x] Stripe packages installed (`stripe`, `@stripe/stripe-js`)
- [x] New billing page created (`page_new.tsx`)
- [x] Stripe API routes created (checkout, webhook, setup-intent)
- [x] Database migration created (`20250123000000_add_stripe_fields.sql`)
- [x] Setup guide created (`STRIPE_SETUP_GUIDE.md`)
- [x] Summary documentation created (`BILLING_REBUILD_SUMMARY.md`)

## 🚀 Next Steps (Required)

### 1. Get Stripe API Keys

- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
- [ ] Copy your **Publishable key** (starts with `pk_test_`)
- [ ] Copy your **Secret key** (starts with `sk_test_`)

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Keys (TEST MODE - for development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note**: You'll get the `STRIPE_WEBHOOK_SECRET` in step 4.

### 3. Run Database Migration

Choose one option:

**Option A - Using Supabase CLI** (recommended):

```bash
supabase db push
```

**Option B - Manual in Supabase Studio**:

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Open `supabase/migrations/20250123000000_add_stripe_fields.sql`
4. Copy and run the SQL

### 4. Set Up Stripe Webhooks (Development)

**Install Stripe CLI** (if not already installed):

- Download from: https://stripe.com/docs/stripe-cli

**Start webhook forwarding**:

```bash
# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/billing/stripe/webhook
```

**Copy the webhook secret**:

- The CLI will output a webhook signing secret (starts with `whsec_`)
- Add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 5. Test the New Billing Page

**Start your dev server**:

```bash
npm run dev
```

**In another terminal, keep Stripe webhook listener running**:

```bash
stripe listen --forward-to localhost:3000/api/billing/stripe/webhook
```

**Navigate to**:

```
http://localhost:3000/dashboard/billing
```

**Test with Stripe test card**:

- Card number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### 6. Replace Old Billing Page (When Ready)

**After testing, activate the new page**:

```bash
# Backup old page
mv src/app/dashboard/billing/page.tsx src/app/dashboard/billing/page_old.tsx

# Activate new page
mv src/app/dashboard/billing/page_new.tsx src/app/dashboard/billing/page.tsx
```

## 📋 Testing Checklist

Test these scenarios before going live:

- [ ] View billing page (all tabs load correctly)
- [ ] Trial countdown displays correctly
- [ ] Add payment method (use test card `4242 4242 4242 4242`)
- [ ] Select a subscription plan
- [ ] Complete Stripe checkout
- [ ] Verify subscription activates (check webhook logs)
- [ ] View updated billing page (shows active subscription)
- [ ] Change subscription plan (upgrade/downgrade)
- [ ] Add an add-on
- [ ] Remove an add-on
- [ ] Test payment failure (use card `4000 0000 0000 0002`)
- [ ] Verify webhook events are processed

## 🔍 Verification Steps

### Check Database Migration

```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name = 'stripe_customer_id';
```

Should return one row showing the new column.

### Check Webhook Events

In Stripe Dashboard:

1. Go to Developers → Webhooks
2. Click on your webhook endpoint
3. View recent events
4. Verify events are being received

### Check Subscription Status

```sql
-- Run in Supabase SQL Editor
SELECT
  c.name as company_name,
  cs.status,
  cs.stripe_subscription_id,
  sp.display_name as plan_name
FROM company_subscriptions cs
JOIN companies c ON c.id = cs.company_id
JOIN subscription_plans sp ON sp.id = cs.plan_id
WHERE c.id = 'YOUR_COMPANY_ID';
```

## 🐛 Troubleshooting

### Webhook not receiving events

**Problem**: Stripe events not showing up in your app

**Solution**:

1. Ensure Stripe CLI is running:
   `stripe listen --forward-to localhost:3000/api/billing/stripe/webhook`
2. Check webhook secret in `.env.local` matches CLI output
3. Restart your dev server after adding webhook secret

### Payment not completing

**Problem**: Checkout completes but subscription not activated

**Solution**:

1. Check browser console for errors
2. Check webhook logs: `stripe listen --print-secret`
3. Verify database migration was applied
4. Check Supabase logs for errors

### Environment variables not loading

**Problem**: API keys not found

**Solution**:

1. Ensure `.env.local` is in project root
2. Restart dev server after adding variables
3. Check for typos in variable names
4. Verify no extra spaces in values

## 📚 Documentation

- **Setup Guide**: `STRIPE_SETUP_GUIDE.md` - Comprehensive setup instructions
- **Summary**: `BILLING_REBUILD_SUMMARY.md` - Overview of all changes
- **Stripe Docs**: https://stripe.com/docs
- **Test Cards**: https://stripe.com/docs/testing#cards

## 🎯 Quick Reference

### Test Cards

| Scenario           | Card Number           | Result                  |
| ------------------ | --------------------- | ----------------------- |
| Success            | `4242 4242 4242 4242` | Payment succeeds        |
| Decline            | `4000 0000 0000 0002` | Payment declined        |
| 3D Secure          | `4000 0025 0000 3155` | Requires authentication |
| Insufficient funds | `4000 0000 0000 9995` | Insufficient funds      |

### Important URLs

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe API Keys**: https://dashboard.stripe.com/test/apikeys
- **Stripe Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Stripe CLI Docs**: https://stripe.com/docs/stripe-cli

### File Locations

```
src/app/dashboard/billing/
  ├── page.tsx              # Old billing page (backup)
  ├── page_new.tsx          # New billing page (to activate)
  └── page_old.tsx          # Old page backup (after migration)

src/app/api/billing/stripe/
  ├── create-checkout/route.ts   # Checkout session creation
  ├── setup-intent/route.ts      # Payment method addition
  └── webhook/route.ts           # Stripe event handling

supabase/migrations/
  └── 20250123000000_add_stripe_fields.sql

Documentation/
  ├── STRIPE_SETUP_GUIDE.md       # Detailed setup instructions
  ├── BILLING_REBUILD_SUMMARY.md  # Overview of changes
  └── BILLING_SYSTEM_SUMMARY.md   # Original system docs
```

## ✨ Features Overview

### New Billing Page Tabs

1. **Overview**
   - Current plan and status
   - Monthly cost breakdown
   - Active sites count
   - Payment method display
   - Quick actions (export, invoices)

2. **Plans**
   - All subscription tiers
   - Per-site pricing calculator
   - Easy plan switching
   - Visual comparison

3. **Add-ons**
   - Available add-ons
   - Active add-ons
   - Tiered options (sensors, kits)
   - One-time and recurring costs

4. **Payment**
   - Payment method management
   - Add/remove cards
   - Default payment method
   - Stripe-powered security

## 🎉 You're Ready!

Once you complete the checklist above, you'll have a fully functional billing
system with:

- ✅ Stripe payment processing
- ✅ Automatic subscription management
- ✅ 60-day trial period
- ✅ Modern, clean UI
- ✅ Webhook automation
- ✅ Invoice tracking

**Need help?** Check the detailed guides:

- `STRIPE_SETUP_GUIDE.md` for step-by-step instructions
- `BILLING_REBUILD_SUMMARY.md` for feature overview
