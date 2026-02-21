'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy /dashboard/checklists page — redirects to /dashboard/todays_tasks.
 * The canonical daily-task view is todays_tasks. This redirect exists so
 * bookmarks and old links still work.
 */
export default function ChecklistsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/todays_tasks')
  }, [router])

  return null
}
