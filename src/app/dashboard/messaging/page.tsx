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
    
    // Redirect back to previous page or dashboard
    // Use replace to avoid adding to history
    const previousPath = document.referrer ? new URL(document.referrer).pathname : '/dashboard'
    if (previousPath.includes('/messaging')) {
      router.replace('/dashboard')
    } else {
      router.back()
    }
  }, [router, setMessagingOpen])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Opening messages...</p>
    </div>
  )
}

