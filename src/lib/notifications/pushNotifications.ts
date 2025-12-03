/**
 * Push Notification Service
 * Handles registration and management of browser push notifications
 */

import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was previously denied')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Register push notification subscription
 */
export async function registerPushSubscription(): Promise<boolean> {
  try {
    // Check support
    if (!isPushNotificationSupported()) {
      console.warn('Push notifications not supported')
      return false
    }

    // Request permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission not granted')
      return false
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    // Get subscription details
    const subscriptionData = subscription.toJSON()
    
    if (!subscriptionData.keys) {
      throw new Error('Subscription keys not available')
    }

    // Get user info - use getSession() to avoid 403 errors
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      // Suppress expected errors - session might not be available yet
      if (sessionError?.code !== 'PGRST116') {
        console.debug('Error fetching session for push subscription:', sessionError?.message || sessionError);
      }
      return false
    }

    const user = session?.user
    if (!user) {
      console.warn('Cannot register push subscription: user not authenticated')
      return false
    }

    // Ensure a matching profile row exists before inserting (FK to profiles.id)
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    // Handle 406 errors (RLS or table doesn't exist) and missing profiles
    if (profileError) {
      if (profileError.code === 'PGRST116' || profileError.message?.includes('406') || profileError.message?.includes('Not Acceptable')) {
        console.warn('Skipping push subscription: profile check failed (RLS or table issue). Profile may not exist yet.')
        return false
      }
      // Suppress expected errors - profile might not exist yet or RLS is blocking
      if (profileError?.code !== 'PGRST116' && profileError?.code !== 'PGRST301') {
        console.debug('Error checking profile before push subscription:', profileError?.message || profileError);
      }
      return false
    }

    if (!profile) {
      console.warn(
        'Skipping push subscription: no profile row found for user. ' +
        'This avoids FK violations on push_subscriptions.user_id. ' +
        'Profile will be created by trigger or auth callback.',
      )
      return false
    }

    // Get device info
    const deviceInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language
    }

    // Save subscription to database
    // Use upsert with onConflict to handle duplicates gracefully
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        user_agent: navigator.userAgent,
        device_info: deviceInfo,
        is_active: true,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint',
        ignoreDuplicates: false // Update if exists
      })

    // ⚠️ ERROR HANDLING FIX - DO NOT REMOVE SUPPRESSION
    // 406/409 errors are expected when push_subscriptions table doesn't exist or RLS blocks.
    // These should be suppressed silently to prevent console noise.
    // Test: tests/error-handling-improvements.spec.ts
    if (error) {
      // Suppress common errors silently (table doesn't exist, RLS issues, conflicts)
      const isSuppressedError = 
        (error as any).code === '23505' || // Unique constraint violation (duplicate)
        (error as any).code === 'PGRST116' || // No rows returned
        (error as any).code === '23503' || // Foreign key violation
        (error as any).status === 406 || // Not Acceptable (table/RLS issue)
        (error as any).status === 409 || // Conflict (duplicate)
        error.message?.includes('foreign key') ||
        error.message?.includes('profiles') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.message?.includes('permission denied');
      
      if (!isSuppressedError) {
        // Extract error message properly - avoid logging empty objects
        const errorMessage = 
          error?.message || 
          error?.error?.message || 
          (typeof error === 'string' ? error : (error && typeof error === 'object' ? JSON.stringify(error) : String(error))) || 
          'Unknown error';
        // Only log if we have a meaningful message (not just "{}" or empty)
        if (errorMessage && errorMessage !== '{}' && errorMessage !== 'Unknown error') {
          console.debug('Error saving push subscription:', errorMessage);
        }
      }
      // Always return false for errors (non-fatal)
      return false;
    }

    console.log('Push subscription registered successfully');
    return true;

  } catch (error: any) {
    // ⚠️ ERROR HANDLING FIX - Suppress expected errors
    // Foreign key violations (23503) are expected when profile doesn't exist yet
    const isSuppressedError = 
      error?.code === '23503' || // Foreign key violation
      error?.error?.code === '23503' ||
      error?.message?.includes('foreign key') ||
      error?.error?.message?.includes('foreign key') ||
      error?.message?.includes('profiles') ||
      error?.error?.message?.includes('profiles') ||
      error?.message?.includes('Key is not present in table') ||
      error?.error?.message?.includes('Key is not present in table');
    
    if (!isSuppressedError) {
      // Extract error message properly - avoid logging empty objects
      const errorMessage = 
        error?.message || 
        error?.error?.message || 
        error?.toString() || 
        (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error)) || 
        'Unknown error';
      // Only log if we have a meaningful message (not just "{}" or empty)
      if (errorMessage && errorMessage !== '{}' && errorMessage !== 'Unknown error' && errorMessage !== '[object Object]') {
        console.debug('Error registering push subscription:', errorMessage);
      }
    }
    // Always return false for errors (non-fatal)
    return false;
  }
}

/**
 * Unregister push notification subscription
 */
export async function unregisterPushSubscription(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // Remove from database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
      }

      console.log('Push subscription unregistered')
      return true
    }

    return false
  } catch (error: any) {
    // Extract error message properly
    const errorMessage = 
      error?.message || 
      error?.error?.message || 
      (typeof error === 'string' ? error : JSON.stringify(error)) || 
      'Unknown error';
    console.debug('Error unregistering push subscription:', errorMessage);
    return false;
  }
}

/**
 * Check if user has active push subscription
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  try {
    // Use getSession() to avoid 403 errors
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Error fetching session for hasActivePushSubscription:', sessionError)
      return false
    }

    const user = session?.user
    if (!user) return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) return false

    // Check database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('is_active')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .eq('is_active', true)
      .maybeSingle()

    // ⚠️ ERROR HANDLING FIX - DO NOT REMOVE SUPPRESSION
    // 406 errors are expected when push_subscriptions table doesn't exist or RLS blocks.
    // Test: tests/error-handling-improvements.spec.ts
    // If there is no active row, data will be null and error will be null with maybeSingle()
    if (error) {
      // Suppress common errors (table doesn't exist, RLS issues)
      const isSuppressedError = 
        (error as any).code === 'PGRST116' || // No rows returned
        (error as any).status === 406 || // Not Acceptable (table/RLS issue)
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.message?.includes('permission denied');
      
      if (!isSuppressedError) {
        console.debug('Error checking push subscription:', error.message || error.code)
      }
      // Treat all errors as "no active subscription" (non-fatal)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking push subscription:', error)
    return false
  }
}

/**
 * Convert VAPID public key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

