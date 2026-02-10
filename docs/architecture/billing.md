# Billing System Implementation Summary

## ✅ What's Been Built

### 1. Database Schema (`supabase/migrations/20250201000000_create_subscription_schema.sql`)

**Tables Created:**

- `subscription_plans` - Stores pricing plans (Starter £40, Pro £55, Enterprise custom)
- `company_subscriptions` - Tracks company subscriptions with 60-day trial
- `invoices` - Manual invoice tracking
- `data_export_requests` - GDPR-compliant data export requests

**Key Features:**

- Automatic 60-day trial period calculation
- Subscription status tracking (trial, active, expired, cancelled, past_due)
- Site count tracking for billing calculations
- Automatic monthly amount calculation (price_per_site × site_count)
- RLS policies for security

### 2. Billing Page (`src/app/dashboard/billing/page.tsx`)

**Features:**

- **Trial Countdown** - Shows days remaining in 60-day trial
- **Subscription Status** - Visual badges for trial/active/expired/cancelled
- **Invoice History** - List of all invoices with status and amounts
- **Data Export** - One-click data export request
- **Terms & Cancellation** - Clear 60-day notice requirement

**UI Components:**

- Status badges with icons
- Trial countdown alert
- Invoice cards with payment status
- Data export button with loading states

### 3. Data Export API (`src/app/api/billing/export/route.ts`)

**Exports:**

- Tasks and checklists
- Task templates and completions
- Incidents
- Assets and maintenance schedules
- SOPs
- Temperature logs (last 10,000)
- All library items (ingredients, PPE, chemicals, etc.)

**Format:** JSON file download

### 4. Subscription Utilities (`src/lib/subscriptions.ts`)

**Functions:**

- `createTrialSubscription()` - Auto-create 60-day trial for new companies
- `updateSubscriptionSiteCount()` - Update billing when sites added/removed
- `checkTrialStatus()` - Check if trial is active and days remaining

### 5. Updated Terms Page (`src/app/terms/page.tsx`)

**Added Sections:**

- 60-day free trial details
- Monthly manual invoicing process
- 60-day cancellation notice requirement
- Data export rights and process

### 6. Navigation (`src/components/layouts/NewMainSidebar.tsx`)

- Added "Billing" link to sidebar with CreditCard icon

---

## 🔧 Next Steps Required

### 1. Run Database Migration

```bash
# Apply the migration to your Supabase database
# This creates all the subscription tables and seed data
```

### 2. Auto-Create Subscriptions for Existing Companies

You'll need to create subscriptions for existing companies. You can do this via:

- Supabase SQL editor
- Or create a one-time migration script

Example SQL:

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

### 3. Hook Up Subscription Creation on Company Signup

Update your company creation flow to call `createTrialSubscription()`:

```typescript
// In your company creation code
import { createTrialSubscription } from "@/lib/subscriptions";

// After creating a company:
await createTrialSubscription(newCompanyId, "starter");
```

### 4. Update Site Count When Sites Are Added/Removed

Call `updateSubscriptionSiteCount()` whenever sites are created/deleted:

```typescript
import { updateSubscriptionSiteCount } from "@/lib/subscriptions";

// After creating/deleting a site:
await updateSubscriptionSiteCount(companyId);
```

### 5. Create Invoice Generation Process

You'll need to create a process (cron job or manual) to:

- Generate monthly invoices after trial ends
- Calculate amounts based on site count
- Send invoices via email
- Update invoice status when paid

**Suggested Approach:**

- Create a Supabase Edge Function for invoice generation
- Run monthly via cron or manual trigger
- Email invoices using SendGrid (already configured)

### 6. Add Subscription Status Checks

Consider adding middleware or route guards to:

- Block access when trial expires (if desired)
- Show warnings when trial is ending
- Redirect to billing page if payment is overdue

### 7. Update Pricing Page

Update `src/app/(marketing)/pricing/page.tsx` to reflect:

- 60-day trial (currently says 14 days)
- Manual invoicing mention

---

## 📋 Manual Invoice Process

Since you're not using Stripe yet, here's the suggested workflow:

1. **Monthly Invoice Generation** (after trial ends):
   - Calculate: `price_per_site × site_count`
   - Create invoice record in `invoices` table
   - Generate PDF (you'll need a PDF generation library)
   - Email invoice to `billing_email`

2. **Payment Tracking**:
   - When payment received, update invoice:
     ```sql
     UPDATE invoices
     SET status = 'paid', paid_at = NOW(), payment_reference = 'INV-12345'
     WHERE id = 'invoice-id';
     ```

3. **Overdue Detection**:
   - Query invoices where `due_date < NOW()` and `status = 'sent'`
   - Update status to `overdue`
   - Send reminder emails

---

## 🔐 Data Export Considerations

**Current Implementation:**

- Exports all data as JSON
- No file size limits (may need pagination for large exports)
- No automatic file cleanup (exports stored indefinitely)

**Future Improvements:**

- Store exports in Supabase Storage
- Add expiration dates (30 days)
- Compress large exports
- Add progress tracking for large exports
- Email download links instead of direct download

---

## 📧 Email Templates Needed

You'll need email templates for:

1. **Trial Ending Soon** (e.g., 7 days before)
2. **Trial Ended** - Invoice sent
3. **Invoice Sent** - With PDF attachment
4. **Payment Reminder** - For overdue invoices
5. **Data Export Ready** - Download link

---

## 🎯 Key Features Summary

✅ **60-Day Free Trial** - Automatic tracking  
✅ **Manual Invoicing** - No Stripe required  
✅ **Data Export** - GDPR compliant  
✅ **60-Day Cancellation Notice** - Documented in terms  
✅ **Site-Based Pricing** - Automatic calculation  
✅ **Invoice History** - Full audit trail

---

## 📝 Notes

- **No Payment Gateway**: System designed for manual invoicing
- **Flexible**: Easy to add Stripe later without major changes
- **GDPR Compliant**: Data export functionality included
- **Scalable**: Can handle multiple plans and pricing tiers

---

## 🚀 Testing Checklist

- [ ] Run database migration
- [ ] Create trial subscription for test company
- [ ] View billing page - verify trial countdown
- [ ] Request data export - verify JSON download
- [ ] Create test invoice - verify display
- [ ] Update site count - verify monthly amount recalculates
- [ ] Test subscription status transitions

---

## 💡 Future Enhancements

- Stripe integration (when ready)
- Automated invoice generation
- PDF invoice generation
- Email notifications
- Subscription upgrade/downgrade flows
- Prorated billing
- Annual billing option
- Discount codes/coupons
