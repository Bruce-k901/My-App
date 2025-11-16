"use client";

import { useEffect, useState } from 'react'
import { useAppContext } from '@/context/AppContext'
import * as pushNotifications from '@/lib/notifications/pushNotifications'

/**
 * Component to initialize push notifications on app load
 * Should be included in the root layout
 */
export function NotificationInitializer() {
  const { user } = useAppContext()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!user || initialized) return

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
          } catch (error) {
            console.error('Error registering service worker:', error)
          }
        }

        setInitialized(true)
      } catch (error) {
        console.error('Error initializing notifications:', error)
      }
    }

    // Small delay to ensure app is fully loaded
    const timer = setTimeout(initializeNotifications, 2000)
    return () => clearTimeout(timer)
  }, [user, initialized])

  return null // This component doesn't render anything
}

