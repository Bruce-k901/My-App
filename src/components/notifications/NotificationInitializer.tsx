"use client";

import { useEffect, useState } from 'react'
import { useAppContext } from '@/context/AppContext'
import * as pushNotifications from '@/lib/notifications/pushNotifications'

/**
 * Component to initialize push notifications on app load
 * Should be included in the root layout
 */
export function NotificationInitializer() {
  const { user, session } = useAppContext()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Only initialize if we have both user and session (fully authenticated)
    if (!user || !session || initialized) return

    const initializeNotifications = async () => {
      try {
        // Check if push notifications are supported
        if (!pushNotifications.isPushNotificationSupported()) {
          console.log('Push notifications not supported')
          return
        }

        // Check if already subscribed
        const hasSubscription = await pushNotifications.hasActivePushSubscription()
        if (hasSubscription) {
          console.log('Push subscription already active')
          setInitialized(true)
          return
        }

        // Register service worker if not already registered
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            })
            console.log('Service Worker registered:', registration.scope)

            // Wait for service worker to be ready
            await navigator.serviceWorker.ready

            // Request permission and register push subscription
            const registered = await pushNotifications.registerPushSubscription()
            if (registered) {
              console.log('Push notifications registered successfully')
            }
          } catch (error: any) {
            // Suppress expected errors (service worker registration failures are non-fatal)
            const isSuppressedError = 
              error?.message?.includes('already registered') ||
              error?.message?.includes('not supported');
            
            if (!isSuppressedError) {
              const errorMessage = error?.message || error?.toString() || 'Unknown error'
              console.debug('Error registering service worker:', errorMessage)
            }
          }
        }

        setInitialized(true)
      } catch (error: any) {
        // Suppress expected errors (push subscription failures are non-fatal)
        const isSuppressedError = 
          error?.code === '23503' || // Foreign key violation
          error?.message?.includes('foreign key') ||
          error?.message?.includes('profiles') ||
          error?.message?.includes('Key is not present');
        
        if (!isSuppressedError) {
          const errorMessage = error?.message || error?.toString() || 'Unknown error'
          console.debug('Error initializing notifications:', errorMessage)
        }
      }
    }

    // Small delay to ensure app is fully loaded
    const timer = setTimeout(initializeNotifications, 2000)
    return () => clearTimeout(timer)
  }, [user, session, initialized])

  return null // This component doesn't render anything
}

