# Stripe Integration Setup Guide

This guide will help you set up Stripe payment processing for your billing
system.

## Overview

The new billing system includes:

- ✅ **Clean, modern UI** with tabbed interface
- ✅ **Stripe payment integration** for subscriptions
- ✅ **Payment method management**
- ✅ **60-day trial period** tracking
- ✅ **Automatic billing** after trial
- ✅ **Webhook handling** for payment events
- ✅ **Invoice generation** from Stripe

## Prerequisites

1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Node.js**: Ensure you have Node.js installed
3. **Supabase**: Your Supabase project should be set up

## Step 1: Install Stripe Package

```bash
npm install stripe @stripe/stripe-js
```

## Step 2: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. For webhooks, you'll need the **Webhook signing secret** (we'll get this in
   Step 5)

## Step 3: Add Environment Variables

Add the following to your `.env.local` file:

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL (for Stripe redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**:

- Use **test keys** for development (they start with `pk_test_` and `sk_test_`)
- Use **live keys** for production (they start with `pk_live_` and `sk_live_`)

## Step 4: Run Database Migration

Apply the Stripe fields migration to your Supabase database:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL in Supabase Studio
# File: supabase/migrations/20250123000000_add_stripe_fields.sql
```

This adds the following fields:

- `companies.stripe_customer_id`
- `company_subscriptions.stripe_subscription_id`
- `subscription_plans.stripe_price_id`
- `subscription_plans.stripe_product_id`
- `invoices.stripe_invoice_id`

## Step 5: Set Up Stripe Webhooks

Webhooks allow Stripe to notify your app about payment events.

### For Development (using Stripe CLI):

1. **Install Stripe CLI**: [Download here](https://stripe.com/docs/stripe-cli)

2. **Login to Stripe**:

   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**:

   ```bash
   stripe listen --forward-to localhost:3000/api/billing/stripe/webhook
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`) and add it to
   `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### For Production:

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/billing/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_method.attached`
5. Copy the **Signing secret** and add it to your production environment
   variables

## Step 6: Create Stripe Products (Optional)

You can create products in Stripe to match your subscription plans:

### Option A: Create via Stripe Dashboard

1. Go to [Stripe Products](https://dashboard.stripe.com/products)
2. Create products for each plan:
   - **Starter Plan**: £40/month per site
   - **Pro Plan**: £55/month per site
   - **Enterprise Plan**: Custom pricing

3. Copy the **Price IDs** and update your database:
   ```sql
   UPDATE subscription_plans
   SET stripe_price_id = 'price_...'
   WHERE name = 'starter';
   ```

### Option B: Create Dynamically (Recommended)

The checkout API will create prices dynamically based on your database plans. No
manual setup needed!

## Step 7: Replace the Old Billing Page

Once you've tested the new billing page, replace the old one:

```bash
# Backup the old page
mv src/app/dashboard/billing/page.tsx src/app/dashboard/billing/page_old.tsx

# Rename the new page
mv src/app/dashboard/billing/page_new.tsx src/app/dashboard/billing/page.tsx
```

## Step 8: Test the Integration

### Test Payment Flow:

1. **Start your development server**:

   ```bash
   npm run dev
   ```

2. **Start Stripe webhook forwarding** (in another terminal):

   ```bash
   stripe listen --forward-to localhost:3000/api/billing/stripe/webhook
   ```

3. **Navigate to billing page**: `http://localhost:3000/dashboard/billing`

4. **Add a payment method**:
   - Click "Add Payment Method"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC

5. **Subscribe to a plan**:
   - Select a plan
   - Complete the checkout
   - Verify the subscription is activated

### Test Cards:

Stripe provides test cards for different scenarios:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`
- **Insufficient funds**: `4000 0000 0000 9995`

Full list: [Stripe Test Cards](https://stripe.com/docs/testing#cards)

## Step 9: Configure Subscription Behavior

### Trial Period Handling:

The system automatically:

- Tracks 60-day trial period
- Shows countdown in billing page
- Prompts for payment method before trial ends
- Activates subscription after trial (if payment method added)

### Automatic Billing:

After trial ends:

- Stripe automatically charges the payment method
- Webhook updates subscription status
- Invoice is created in your database
- Customer receives email receipt from Stripe

## Step 10: Customize Email Notifications (Optional)

Stripe sends automatic emails for:

- Payment confirmations
- Failed payments
- Subscription updates

Customize these in
[Stripe Email Settings](https://dashboard.stripe.com/settings/emails)

## Architecture Overview

### Payment Flow:

```
User clicks "Subscribe"
    ↓
Frontend calls /api/billing/stripe/create-checkout
    ↓
API creates Stripe Checkout Session
    ↓
User redirected to Stripe Checkout
    ↓
User enters payment details
    ↓
Stripe processes payment
    ↓
Stripe sends webhook to /api/billing/stripe/webhook
    ↓
Webhook updates database (subscription status, invoice)
    ↓
User redirected back to billing page
```

### Key Components:

1. **Frontend** (`page_new.tsx`):
   - Modern tabbed interface
   - Plan selection
   - Add-on management
   - Payment method display

2. **API Routes**:
   - `/api/billing/stripe/create-checkout`: Creates Stripe Checkout session
   - `/api/billing/stripe/setup-intent`: Adds payment method without charging
   - `/api/billing/stripe/webhook`: Handles Stripe events

3. **Database**:
   - Stores subscription status
   - Links Stripe IDs to companies
   - Tracks invoices

## Troubleshooting

### Webhook not receiving events:

- Ensure Stripe CLI is running:
  `stripe listen --forward-to localhost:3000/api/billing/stripe/webhook`
- Check webhook signing secret in `.env.local`
- Verify endpoint URL is correct

### Payment not completing:

- Check browser console for errors
- Verify API keys are correct
- Ensure webhook is processing events
- Check Stripe Dashboard logs

### Subscription not activating:

- Check webhook logs in Stripe Dashboard
- Verify database migration was applied
- Ensure RLS policies allow updates

## Going Live

Before going to production:

1. ✅ Switch to **live API keys** in production environment
2. ✅ Set up **production webhook endpoint**
3. ✅ Test with real payment (small amount)
4. ✅ Configure **Stripe email templates**
5. ✅ Set up **Stripe billing portal** (for customers to manage subscriptions)
6. ✅ Review **Stripe security settings**
7. ✅ Enable **3D Secure** for EU customers (SCA compliance)

## Additional Features

### Stripe Customer Portal:

Allow customers to manage their own subscriptions:

```typescript
// Create portal session
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
});

// Redirect to portal
window.location.href = session.url;
```

### Proration:

Stripe automatically handles proration when:

- Upgrading/downgrading plans
- Adding/removing sites
- Changing billing cycle

### Coupons & Discounts:

Create coupons in Stripe Dashboard and apply them at checkout:

```typescript
const session = await stripe.checkout.sessions.create({
  // ... other options
  discounts: [
    {
      coupon: "SUMMER20", // 20% off coupon
    },
  ],
});
```

## Support

- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: Available in Dashboard
- **Test Mode**: Use test keys to experiment safely

## Summary

You now have a fully integrated billing system with:

- ✅ Stripe payment processing
- ✅ Automatic subscription management
- ✅ 60-day trial period
- ✅ Webhook event handling
- ✅ Invoice tracking
- ✅ Payment method management

The system handles the entire subscription lifecycle automatically, from trial
to active subscription to renewals and cancellations.
