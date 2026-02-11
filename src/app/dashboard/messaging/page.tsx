'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePanelStore } from '@/lib/stores/panel-store'

export default function MessagingRedirectPage() {
  const router = useRouter()
  const setMessagingOpen = usePanelStore((state) => state.setMessagingOpen)

  useEffect(() => {
    // Open the messaging panel
    setMessagingOpen(true)
    // Always navigate to dashboard - router.back() is unreliable
    // and can navigate outside the app (e.g., to login page), causing logout
    router.replace('/dashboard')
  }, [router, setMessagingOpen])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Opening messages...</p>
    </div>
  )
}

