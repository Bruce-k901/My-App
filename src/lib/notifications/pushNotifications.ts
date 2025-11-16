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

    // Get user info
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get device info
    const deviceInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language
    }

    // Save subscription to database
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
        onConflict: 'user_id,endpoint'
      })

    if (error) {
      console.error('Error saving push subscription:', error)
      throw error
    }

    console.log('Push subscription registered successfully')
    return true

  } catch (error) {
    console.error('Error registering push subscription:', error)
    return false
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
  } catch (error) {
    console.error('Error unregistering push subscription:', error)
    return false
  }
}

/**
 * Check if user has active push subscription
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) return false

    // Check database
    const { data } = await supabase
      .from('push_subscriptions')
      .select('is_active')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .eq('is_active', true)
      .single()

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

