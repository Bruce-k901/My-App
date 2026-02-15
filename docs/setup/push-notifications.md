# VAPID Keys Setup for Web Push Notifications

## ✅ VAPID Keys Generated

Your VAPID keys have been generated:

**Public Key:**

```
BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk
```

**Private Key:**

```
4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw
```

## Step 1: Add to .env.local

Add these keys to your `.env.local` file:

```bash
# VAPID Keys for Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk
VAPID_PRIVATE_KEY=4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw
```

**Note:** The public key is prefixed with `NEXT_PUBLIC_` so it's available in the browser. The private key should NEVER be exposed to the client.

## Step 2: Add to Supabase Edge Function Secrets

The edge function `check-task-notifications` needs access to these keys:

1. Go to **Supabase Dashboard** → **Edge Functions** → **check-task-notifications**
2. Click **"Settings"** or **"Secrets"**
3. Add these environment variables:
   - `VAPID_PUBLIC_KEY` = `BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk`
   - `VAPID_PRIVATE_KEY` = `4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw`

Or via CLI:

```bash
supabase secrets set VAPID_PUBLIC_KEY="BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk"
supabase secrets set VAPID_PRIVATE_KEY="4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw"
```

## Step 3: Update Push Notification Client Code

Make sure your `src/lib/notifications/pushNotifications.ts` uses the public key from environment variables:

```typescript
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

if (!vapidPublicKey) {
  throw new Error("VAPID public key is not set");
}
```

## Step 4: Verify Setup

1. **Check .env.local** has the keys
2. **Check Supabase Edge Function** has the secrets set
3. **Restart your dev server** if running: `npm run dev`
4. **Test push notification registration** in your app

## What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are used to:

- Identify your application server to push services
- Authenticate push message requests
- Ensure only your server can send push notifications to your users

**Security Notes:**

- ✅ Public key: Safe to expose in client code
- ❌ Private key: Must be kept secret, only on server/edge function
- 🔒 Never commit private keys to git

## Troubleshooting

### Keys not working?

- Make sure both keys are set in `.env.local` and Supabase secrets
- Restart your dev server after adding to `.env.local`
- Check browser console for errors when registering push

### Need to regenerate keys?

```bash
npx web-push generate-vapid-keys
```

Then update both `.env.local` and Supabase secrets with the new keys.
