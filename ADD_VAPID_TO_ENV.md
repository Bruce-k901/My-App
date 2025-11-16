# Add VAPID Keys to .env.local

## ✅ Your Generated VAPID Keys

**Public Key:**

```
BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk
```

**Private Key:**

```
4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw
```

## Step 1: Add to .env.local

Open your `..lenvocal` file (create it if it doesn't exist) and add these lines:

```bash
# VAPID Keys for Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk
VAPID_PRIVATE_KEY=4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw
```

**Important Notes:**

- ✅ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Safe to expose in browser (starts with `NEXT_PUBLIC_`)
- ❌ `VAPID_PRIVATE_KEY` - Keep secret, only used server-side
- 🔒 Never commit `.env.local` to git (it should be in `.gitignore`)

## Step 2: Add to Supabase Edge Function Secrets

Your edge function `check-task-notifications` needs these keys too:

### Option A: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx
2. Navigate to: **Edge Functions** → **check-task-notifications**
3. Click **"Settings"** or look for **"Secrets"** section
4. Add these environment variables:
   - **Name**: `VAPID_PUBLIC_KEY`
   - **Value**: `BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk`
   - **Name**: `VAPID_PRIVATE_KEY`
   - **Value**: `4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw`

### Option B: Via Supabase CLI

```bash
supabase secrets set VAPID_PUBLIC_KEY="BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk"
supabase secrets set VAPID_PRIVATE_KEY="4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw"
```

## Step 3: Restart Development Server

After adding to `.env.local`:

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 4: Verify It Works

1. Check browser console for any errors when registering push
2. The `pushNotifications.ts` file already uses `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`
3. Test push notification registration in your app

## Complete .env.local Example

Your `.env.local` should look something like this:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xijoybubtrgbrhquqwrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_URL=https://xijoybubtrgbrhquqwrx.supabase.co

# VAPID Keys for Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk
VAPID_PRIVATE_KEY=4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw

# Application Environment
NEXT_PUBLIC_APP_ENV=development
```

## Troubleshooting

### Keys not working?

- ✅ Make sure both keys are in `.env.local`
- ✅ Restart dev server after adding keys
- ✅ Check Supabase Edge Function has secrets set
- ✅ Verify no typos in key values

### Need to regenerate?

```bash
npx web-push generate-vapid-keys
```

Then update both `.env.local` and Supabase secrets with new keys.
