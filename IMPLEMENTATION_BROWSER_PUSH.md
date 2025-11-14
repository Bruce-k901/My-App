# Browser Push Notifications - Implementation Guide

## Quick Start: Adding Browser Push to Your App

This guide shows you how to implement browser push notifications step-by-step.

---

## Step 1: Install Dependencies

```bash
npm install web-push
npm install --save-dev @types/web-push
```

---

## Step 2: Generate VAPID Keys

VAPID keys are required for browser push. Generate them once:

```bash
npx web-push generate-vapid-keys
```

This outputs:

```
Public Key: BKx... (save this)
Private Key: ... (save this - keep secret!)
```

**Add to `.env.local`:**

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKx...
VAPID_PRIVATE_KEY=... (keep secret)
```

---

## Step 3: Create Service Worker

Create `public/sw.js`:

```javascript
// Service Worker for Push Notifications
self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Checkly Notification";
  const options = {
    body: data.message || "You have a new notification",
    icon: "/icon-192x192.png", // Your app icon
    badge: "/badge-72x72.png",
    tag: data.id || "default",
    requireInteraction: data.urgent || false,
    data: {
      url: data.url || "/notifications",
      notificationId: data.id,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data.url || "/notifications";

  event.waitUntil(clients.openWindow(url));
});
```

---

## Step 4: Create Push Notification Utility

Create `src/lib/push-notifications.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Request browser permission for push notifications
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Register service worker and get push subscription
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js");

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Convert to our format
    const subscriptionData: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
        auth: arrayBufferToBase64(subscription.getKey("auth")!),
      },
    };

    return subscriptionData;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return false;
  }
}

/**
 * Check if user is subscribed
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// Helper: Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
```

---

## Step 5: Create Push Subscription Component

Create `src/components/notifications/PushPermissionPrompt.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import {
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed
} from '@/lib/push-notifications';
import { supabase } from '@/lib/supabaseClient';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export function PushPermissionPrompt() {
  const { userId } = useAppContext();
  const { showToast } = useToast();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    const isSub = await isSubscribed();
    setSubscribed(isSub);
  }

  async function handleEnable() {
    setLoading(true);
    try {
      // Request permission
      const granted = await requestPushPermission();
      if (!granted) {
        showToast('Notification permission denied', 'error');
        return;
      }

      // Subscribe to push
      const subscription = await subscribeToPush();
      if (!subscription) {
        showToast('Failed to subscribe to push notifications', 'error');
        return;
      }

      // Save subscription to database
      if (userId) {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            subscription: subscription,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;
      }

      setSubscribed(true);
      showToast('Push notifications enabled!', 'success');
    } catch (error: any) {
      console.error('Error enabling push:', error);
      showToast(error.message || 'Failed to enable push notifications', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      await unsubscribeFromPush();

      if (userId) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }

      setSubscribed(false);
      showToast('Push notifications disabled', 'success');
    } catch (error: any) {
      console.error('Error disabling push:', error);
      showToast('Failed to disable push notifications', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (subscribed === null) {
    return null; // Still checking
  }

  return (
    <div className="flex items-center gap-2">
      {subscribed ? (
        <Button
          onClick={handleDisable}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <BellOff className="h-4 w-4" />
          Disable Push
        </Button>
      ) : (
        <Button
          onClick={handleEnable}
          disabled={loading}
          variant="default"
          size="sm"
          className="gap-2"
        >
          <Bell className="h-4 w-4" />
          Enable Push Notifications
        </Button>
      )}
    </div>
  );
}
```

---

## Step 6: Create Database Table

Create `supabase/sql/push_subscriptions.sql`:

```sql
-- Store browser push subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null, -- Stores endpoint, keys.p256dh, keys.auth
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Index for quick lookups
create index if not exists idx_push_subscriptions_user_id
  on public.push_subscriptions(user_id);

-- RLS policies
alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy push_subscriptions_update_own
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
```

---

## Step 7: Create Edge Function to Send Push

Create `supabase/functions/send-push-notification/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import webpush from "https://deno.land/x/webpush@v1.0.0/mod.ts";

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { userId, title, message, url, urgent } = await req.json();

    if (!userId || !title || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Get user's push subscription
    const { data: subscription, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .single();

    if (error || !subscription) {
      return new Response(JSON.stringify({ error: "No push subscription found" }), { status: 404 });
    }

    // Send push notification
    const payload = JSON.stringify({
      title,
      message,
      url: url || "/notifications",
      id: crypto.randomUUID(),
      urgent: urgent || false,
    });

    await webpush.sendNotification(subscription.subscription as any, payload, {
      vapidDetails: {
        subject: "mailto:no-reply@checkly.app",
        publicKey: VAPID_PUBLIC_KEY!,
        privateKey: VAPID_PRIVATE_KEY!,
      },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Error sending push:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Add to Supabase Edge Function secrets:**

```bash
supabase secrets set VAPID_PUBLIC_KEY=your-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-private-key
```

---

## Step 8: Update Settings Page

Add push notification toggle to `src/app/settings/page.tsx`:

```typescript
// Add to imports
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt';

// Add in settings UI (around line 164)
<div className="space-y-4">
  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
    <div>
      <p className="font-medium">Browser Push Notifications</p>
      <p className="text-sm text-slate-400">
        Receive instant notifications even when the app is closed.
      </p>
    </div>
    <PushPermissionPrompt />
  </div>

  {/* Existing email digest toggle */}
  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
    {/* ... existing code ... */}
  </div>
</div>
```

---

## Step 9: Send Push When Notification Created

Update your notification triggers to also send push. Modify `supabase/sql/notifications.sql`:

```sql
-- Function to send push notification when notification is created
create or replace function public.send_push_on_notification()
returns trigger language plpgsql as $$
declare
  user_subscription jsonb;
begin
  -- Only send push for critical/warning notifications
  if new.severity in ('critical', 'warning') then
    -- Get user's push subscription
    select subscription into user_subscription
    from public.push_subscriptions
    where user_id = new.user_id
    limit 1;

    -- If user has push subscription, trigger edge function
    if user_subscription is not null then
      -- Note: This would typically be done via pg_net or edge function trigger
      -- For now, we'll mark it for processing
      perform net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'userId', new.user_id,
          'title', new.title,
          'message', new.message,
          'url', '/notifications',
          'urgent', new.severity = 'critical'
        )
      );
    end if;
  end if;

  return new;
end;$$;

-- Create trigger
drop trigger if exists trg_send_push_on_notification on public.notifications;
create trigger trg_send_push_on_notification
after insert on public.notifications
for each row execute function public.send_push_on_notification();
```

**Note:** The above uses `pg_net` extension. Alternatively, call the edge function from your application code when creating notifications.

---

## Step 10: Test It!

1. **Start your app**: `npm run dev`
2. **Visit settings page**: Click "Enable Push Notifications"
3. **Allow permission**: Browser will ask for permission
4. **Create a test notification**: Trigger a temperature failure or incident
5. **Check notification**: Should appear as native OS notification!

---

## Troubleshooting

### "Service worker registration failed"

- Ensure `public/sw.js` exists
- Check browser console for errors
- HTTPS required (localhost works for development)

### "VAPID key error"

- Verify `.env.local` has correct keys
- Regenerate keys if needed: `npx web-push generate-vapid-keys`

### "Push notification not received"

- Check browser notification permissions
- Verify subscription saved in database
- Check Supabase Edge Function logs
- Test with browser DevTools > Application > Service Workers

---

## Next Steps

1. ✅ Browser Push implemented
2. **Add SMS** - See `IMPLEMENTATION_SMS.md` (to be created)
3. **Add WhatsApp** - See `IMPLEMENTATION_WHATSAPP.md` (to be created)
4. **Add user preferences** - Let users choose which notifications to receive

---

## Resources

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push library](https://www.npmjs.com/package/web-push)
