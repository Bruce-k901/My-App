# Billing Integration - Remaining Steps

## ✅ Completed

- [x] Stripe packages installed
- [x] New billing page activated
- [x] Payment method addition working (test card saved successfully)
- [x] Stripe Elements integrated
- [x] API routes created (using temporary workaround for setup-intent)

## 🚀 Critical Next Steps

### 1. Run Database Migration

The Stripe fields need to be added to your database tables.

**Option A - Using Supabase CLI** (recommended):

```bash
supabase db push
```

**Option B - Manual in Supabase Studio**:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of
   `supabase/migrations/20250123000000_add_stripe_fields.sql`
4. Run the SQL

**Verify migration**:

```sql
-- Run in Supabase SQL Editor to verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name LIKE 'stripe%';
```

Should return:

- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)

### 2. Set Up Stripe Webhooks

Webhooks are critical for handling subscription events (payments, cancellations,
etc.).

**For Development (Local Testing)**:

The Stripe CLI should already be installed in `.\stripe_cli\`.

**Start webhook forwarding**:

```powershell
# In a separate terminal, keep this running while developing
.\stripe_cli\stripe.exe listen --forward-to http://localhost:3000/api/billing/stripe/webhook
```

**Copy the webhook secret**:

- The CLI will output: `Ready! Your webhook signing secret is whsec_...`
- Copy that secret and add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

**Restart your dev server** after adding the secret.

**For Production (Vercel/Live)**:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter your production URL:
   `https://yourdomain.com/api/billing/stripe/webhook`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_method.attached`
5. Copy the **Signing secret** and add to Vercel environment variables as
   `STRIPE_WEBHOOK_SECRET`

### 3. Implement Plan Selection & Checkout

Currently, the Payment tab works, but you need to connect the **Plans** and
**Add-ons** tabs to Stripe Checkout.

**Update PlansTab to use Stripe Checkout**:

When a user clicks "Select Plan" or "Change Plan", it should:

1. Call `/api/billing/stripe/create-checkout`
2. Redirect to Stripe Checkout
3. Return to billing page after payment

**Update AddonsTab similarly** for add-on purchases.

I can help implement this if needed.

### 4. Load Real Payment Methods

Currently, the Payment tab shows placeholder data. You need to:

1. Create an API route to fetch payment methods from Stripe
2. Update `loadBillingData()` in the billing page to call this route
3. Display actual cards from Stripe

**Create** `src/app/api/billing/stripe/payment-methods/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get("company_id");

    if (!company_id) {
      return NextResponse.json(
        { error: "Missing company_id" },
        {
          status: 400,
        },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", company_id)
      .single();

    if (!company?.stripe_customer_id) {
      return NextResponse.json({ paymentMethods: [] });
    }

    const stripe = getStripe();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: company.stripe_customer_id,
      type: "card",
    });

    return NextResponse.json({
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
        is_default: false, // You can check customer.invoice_settings.default_payment_method
      })),
    });
  } catch (error: any) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 5. Fix the API Route 404 Issue (Clean Up)

Currently, we're using a workaround (hijacking the `change-plan` route). Once
you can restart the server reliably:

1. **Revert the change-plan route** to its original state
2. **Use the dedicated route**: `/api/billing/stripe/setup-intent`
3. **Delete the `.next` folder** and restart if routes still don't work

This is not urgent but should be cleaned up before production.

### 6. Test Complete Flow

Once webhooks are set up:

- [ ] Add payment method (already working ✅)
- [ ] Select a plan → Stripe Checkout → Payment → Webhook → Subscription
      activated
- [ ] View subscription status on Overview tab
- [ ] Change plan (upgrade/downgrade)
- [ ] Add an add-on
- [ ] Cancel subscription
- [ ] Test payment failure (card `4000 0000 0000 0002`)

### 7. Production Deployment

When ready to go live:

**Update environment variables in Vercel**:

```env
# Switch to LIVE keys (remove _test_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_SECRET
```

**Set up production webhook** (see step 2 above).

**Test thoroughly in staging** before switching live keys.

## 📋 Quick Testing Checklist

- [x] Payment method addition works
- [ ] Database migration applied
- [ ] Webhook forwarding active (dev)
- [ ] Plan selection triggers Stripe Checkout
- [ ] Checkout completion activates subscription
- [ ] Subscription status displays correctly
- [ ] Add-on purchase works
- [ ] Invoice history populates

## 🐛 Known Issues

### Temporary Workaround Active

The setup-intent API is currently routed through `/api/billing/change-plan` with
`action: 'setup_intent'`. This works but should be cleaned up to use the
dedicated `/api/billing/stripe/setup-intent` route.

**To fix**:

1. Stop dev server
2. Delete `.next` folder
3. Restart dev server
4. Update `page.tsx` to use `/api/billing/stripe/setup-intent`
5. Remove the hijack code from `change-plan/route.ts`

## 📚 Resources

- **Stripe Test Cards**: https://stripe.com/docs/testing#cards
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Detailed Setup Guide**: `STRIPE_SETUP_GUIDE.md`
- **Full Summary**: `BILLING_REBUILD_SUMMARY.md`

## 🎯 Priority Order

1. **Run database migration** (critical - required for everything else)
2. **Set up webhook forwarding** (critical - required for subscriptions)
3. **Implement plan selection checkout** (high - core feature)
4. **Load real payment methods** (medium - improves UX)
5. **Clean up API routing** (low - technical debt)

---

**Need help with any of these steps?** Just ask!
